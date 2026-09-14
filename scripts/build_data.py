from pathlib import Path
import argparse, json, re, zipfile, xml.etree.ElementTree as ET

PROJECT = Path(__file__).resolve().parents[1]

def clean(v):
    if v is None: return ""
    s = str(v).strip()
    if s.endswith(".0") and s[:-2].isdigit(): s = s[:-2]
    return s

def norm_yes(v):
    s = clean(v).lower().replace("í","i")
    return s == "si"

def parse_xlsx(path):
    zf = zipfile.ZipFile(path)
    ns = {
        "a":"http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "r":"http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    }
    shared=[]
    if "xl/sharedStrings.xml" in zf.namelist():
        rr=ET.fromstring(zf.read("xl/sharedStrings.xml"))
        for si in rr:
            shared.append("".join((t.text or "") for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")))
    wb=ET.fromstring(zf.read("xl/workbook.xml"))
    rels=ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    relmap={r.attrib["Id"]:r.attrib["Target"] for r in rels}
    targets={}
    for s in wb.find("a:sheets",ns):
        rid=s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        t=relmap[rid]
        if not t.startswith("xl/"): t="xl/"+t.lstrip("/")
        targets[s.attrib["name"]]=t

    def col_idx(col):
        n=0
        for ch in col: n=n*26+ord(ch)-64
        return n-1

    def parse_sheet(name):
        if name not in targets:
            return []
        root=ET.fromstring(zf.read(targets[name]))
        rows=[]
        for row in root.findall(".//a:sheetData/a:row",ns):
            vals={}
            for c in row.findall("a:c",ns):
                m=re.match(r"([A-Z]+)",c.attrib["r"])
                if not m: continue
                idx=col_idx(m.group(1))
                typ=c.attrib.get("t")
                v=c.find("a:v",ns)
                if typ=="inlineStr":
                    t=c.find("a:is/a:t",ns)
                    val=t.text if t is not None else ""
                elif v is None:
                    val=""
                elif typ=="s":
                    val=shared[int(v.text)]
                elif typ=="b":
                    val="TRUE" if v.text=="1" else "FALSE"
                else:
                    val=v.text
                vals[idx]=val
            if vals:
                arr=[""]*(max(vals)+1)
                for k,v in vals.items(): arr[k]=v
                rows.append(arr)
        return rows

    return parse_sheet

def gv(r,i):
    return clean(r[i]) if i < len(r) else ""

def normalize_ugel(v):
    s=clean(v)
    m=re.search(r"UGEL\s*0?([1-7])",s,re.I)
    return f"UGEL 0{m.group(1)}" if m else s

def build_rei_map(rei_path):
    if not rei_path or not Path(rei_path).exists():
        return {}
    parse=parse_xlsx(rei_path)
    rows=parse("Hoja1")
    if not rows: return {}
    mp={}
    for r in rows[1:]:
        item={
            "ugel_rei":normalize_ugel(gv(r,1)),
            "rei":gv(r,2),
            "rei_nucleo":"Sí" if norm_yes(gv(r,5)) else "",
            "rei_modalidad":gv(r,6),
            "rei_nombre_ie":gv(r,7)
        }
        for idx in (3,4):
            code=gv(r,idx)
            if code: mp[code]=item.copy()
    return mp

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("excel")
    ap.add_argument("--rei", default="")
    ap.add_argument("--corte", default="")
    args=ap.parse_args()

    excel=Path(args.excel)
    if not excel.exists():
        raise SystemExit(f"No existe: {excel}")

    rei_path=Path(args.rei) if args.rei else None
    rei_map=build_rei_map(rei_path)

    parse=parse_xlsx(excel)
    reg=parse("Reg_Org")
    ebr=parse("Clubes_OrgEBR")
    eba=parse("Clubes_OrgEBA")
    ebe=parse("Clubes_OrgEBE")
    adv=parse("ClubesAsesorOrg")
    advsimple=parse("ClubesAsesor")

    directors=[]
    for r in reg[1:]:
        mod=gv(r,8)
        if mod=="EBR": q31,q32=gv(r,15),gv(r,16)
        elif mod=="EBA": q31,q32=gv(r,18),gv(r,19)
        else: q31,q32=gv(r,21),gv(r,22)
        cl=gv(r,10)
        rm=rei_map.get(cl,{})
        directors.append({
            "id":gv(r,2),"ugel":normalize_ugel(gv(r,7)),"modalidad":mod,
            "ie":gv(r,9),"codigo_local":cl,"gestion":gv(r,11),"director":gv(r,12),
            "rei":rm.get("rei",""),"rei_nucleo":rm.get("rei_nucleo",""),
            "q31":q31,"q32":q32,
            "q41":gv(r,24),"q42":gv(r,25),"q43":gv(r,26),"q44":gv(r,27),
            "q45":gv(r,28),"q46":gv(r,29),"q47":gv(r,30),"q48":gv(r,31),
            "evidencia_rd":bool(gv(r,32) or gv(r,33))
        })
    dmap={x["id"]:x for x in directors}

    def get_type(r):
        for i in (4,6,8,10):
            if gv(r,i):
                raw=gv(r,i)
                return gv(r,i+1) if "otro" in raw.lower() and gv(r,i+1) else raw
        return ""

    def club_rows(rows,mod):
        out=[]
        for r in rows[1:]:
            parent=dmap.get(gv(r,1),{})
            if mod=="EBR":
                nivel,codmod,asesor,cond,horas,horario,lider,mon = gv(r,12),gv(r,22),gv(r,23),gv(r,28),gv(r,29),gv(r,30),gv(r,31),gv(r,32)
            elif mod=="EBA":
                nivel,codmod,asesor,cond,horas,horario,lider,mon = gv(r,12),gv(r,16),gv(r,17),gv(r,22),"",gv(r,23),gv(r,24),gv(r,25)
            else:
                nivel,codmod,asesor,cond,horas,horario,lider,mon = gv(r,12),gv(r,18),gv(r,19),gv(r,24),"",gv(r,25),gv(r,26),gv(r,27)
            out.append({
                "director_id":gv(r,1),
                "ugel":parent.get("ugel",""),"rei":parent.get("rei",""),"rei_nucleo":parent.get("rei_nucleo",""),
                "modalidad":mod,"ie":parent.get("ie",""),"codigo_local":parent.get("codigo_local",""),
                "gestion":parent.get("gestion",""),"director":parent.get("director",""),
                "club":gv(r,2),"area":gv(r,3),"tipo":get_type(r),
                "nivel_ciclo":nivel,"codigo_modular":codmod,
                "docente_asesor":asesor,"condicion_laboral":cond,
                "usa_horas_atencion":horas,"horario":horario,
                "liderazgo_estudiantil":lider,"monitoreo_asesor":mon
            })
        return out

    clubs=club_rows(ebr,"EBR")+club_rows(eba,"EBA")+club_rows(ebe,"EBE")

    gest_local={}
    dir_local={}
    for d in directors:
        if d["codigo_local"]:
            gest_local.setdefault(d["codigo_local"],d["gestion"])
            dir_local.setdefault(d["codigo_local"],d["director"])

    advisers=[]
    for ix,r in enumerate(adv[1:],1):
        mod=gv(r,8)
        sr=advsimple[ix] if ix < len(advsimple) else []
        if mod=="EBR":
            club,area,nivel,horario,horas=gv(r,15),gv(r,16),gv(r,25),gv(r,31),gv(r,30); pairs=(17,19,21,23)
        elif mod=="EBA":
            club,area,nivel,horario,horas=gv(r,33),gv(r,34),gv(r,43),gv(r,48),""; pairs=(35,37,39,41)
        else:
            club,area,nivel,horario,horas=gv(r,50),gv(r,51),gv(r,60),gv(r,64),""; pairs=(52,54,56,58)
        typ=""
        for i in pairs:
            if gv(r,i):
                raw=gv(r,i)
                typ=gv(r,i+1) if "otro" in raw.lower() and gv(r,i+1) else raw
                break
        inscritos=0
        try: inscritos=int(float(gv(sr,14)))
        except: pass
        cl=gv(r,7)
        rm=rei_map.get(cl,{})
        rei_from_sheet=gv(sr,3)
        advisers.append({
            "ugel":normalize_ugel(gv(r,5)),"rei":rei_from_sheet or rm.get("rei",""),
            "rei_nucleo":rm.get("rei_nucleo",""),"ie":gv(r,6),"codigo_local":cl,"modalidad":mod,
            "gestion":gest_local.get(cl,"Sin vincular"),"director":dir_local.get(cl,""),
            "club":club,"area":area,"tipo":typ,"nivel_ciclo":nivel,"inscritos":inscritos,
            "usa_horas_atencion":horas,
            "q41":gv(r,66),"q42":gv(r,67),"q43":gv(r,68),"q44":gv(r,69),
            "q45":gv(r,70),"q46":gv(r,71),"q47":gv(r,72),"q48":gv(r,73),
            "evidencia_rd":bool(gv(r,74) or gv(r,75)),
            "evidencia_plan":bool(gv(r,76) or gv(r,77)),
            "evidencia_sesion":bool(gv(r,78) or gv(r,79))
        })

    fecha=args.corte.strip()
    data={
        "meta":{
            "titulo":"Clubes Escolares 2026",
            "fuente":"Monitoreo Clubes Escolares 2026",
            "elaborado":"Equipo de Estadística y Monitoreo - OPP - DRELM",
            "fecha_corte":fecha,
            "rei_fuente":"Redes Educativas DRELM" if rei_map else "Sin archivo REI",
            "nota_33":"Las preguntas 3.3 y 3.4 figuran en la ficha del Director, pero no están como campos en la exportación actual."
        },
        "director":{"registros":directors,"clubes":clubs},
        "asesor":{"registros":advisers}
    }

    targets=[PROJECT/"public"/"data"/"clubes.json", PROJECT/"data"/"clubes.json"]
    for out in targets:
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")

    print("OK")
    print("Fecha de corte:", fecha or "(sin fecha)")
    print("Director:",len(directors))
    print("Clubes:",len(clubs))
    print("Asesores:",len(advisers))
    print("REI asignada a registros Director:",sum(1 for x in directors if x["rei"]))
    print("REI asignada a clubes:",sum(1 for x in clubs if x["rei"]))
    print("REI asignada a asesores:",sum(1 for x in advisers if x["rei"]))

if __name__=="__main__":
    main()
