"""Build and seed a merged, quality-checked Myntra product catalog.

`products.category` remains the existing UI's Men/Women/Kids filter dimension;
normalised merchandise categories are retained in `products.subcategory`.
"""
from __future__ import annotations
import argparse, ast, csv, html, io, os, re, uuid, zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

NAMESPACE = uuid.UUID("702bc5f4-2237-4a9a-902d-94a2bcc1cbb7")
DOWNLOADS = Path.home() / "Downloads"
DEFAULT_LEGACY_SOURCE = DOWNLOADS / "archive" / "Fashion Dataset.csv"
DEFAULT_NEW_SOURCE = DOWNLOADS / "Myntra_fashion_products.csv.zip"
VALID_GENDERS = {"Men", "Women", "Unisex", "Kids"}
FIELD_ALIASES = {
 "product_id": ("product id","product_id","p id","p_id","sku","id","mpn"), "sku": ("sku","product sku","product_id","p_id","mpn"),
 "name": ("name","product name","product_name","title"), "brand": ("brand","brand name","brand_name","manufacturer"),
 "description": ("description","product description","product_description","details"), "price": ("price","selling price","selling_price","mrp","amount"),
 "currency": ("currency","price currency","price_currency"), "image": ("image url","image_url","img","image","images","image urls"),
 "gender": ("gender","gender category","gender_category","department"), "color": ("colour","color","colour name","color name"),
 "rating": ("avg rating","avg_rating","rating","product rating"), "reviews": ("ratingcount","rating count","review count","reviews","ratings count"),
 "attributes": ("p attributes","p_attributes","attributes","product attributes"), "category": ("category","product category","product_category"),
 "subcategory": ("subcategory","sub category","product type","product_type"),
}
def clean(v: Any) -> str:
 v=re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",html.unescape(str(v or "")))).strip()
 return "" if v.casefold() in {"","na","n/a","none","null","nan"} else v
def header(v: str) -> str: return re.sub(r"[^a-z0-9]+"," ",v.casefold()).strip()
def field_map(headers: Iterable[str|None]) -> dict[str,str]:
 available={header(h or ""):h or "" for h in headers}
 return {canonical:available[alias] for canonical,aliases in FIELD_ALIASES.items() for alias in aliases if alias in available}
def value(row: dict[str,Any], columns: dict[str,str], name: str) -> str: return clean(row.get(columns.get(name,"")))
def number(v: str, default: float=0) -> float:
 found=re.search(r"-?[0-9][0-9,]*(?:\.[0-9]+)?",clean(v)); return float(found.group(0).replace(",","")) if found else default
def first_image(raw: str) -> str:
 for item in re.split(r"\s*(?:~|\||,|;|\[|\])\s*",raw):
  item=item.strip(" '\"")
  if item.startswith(("https://","http://")): return item
 return ""
def image_quality(url: str) -> int: return (10000 if url.startswith("https://") else 5000 if url.startswith("http://") else 0)+len(url)
def attributes(raw: str) -> dict[str,str]:
 try: parsed=ast.literal_eval(raw)
 except (SyntaxError,ValueError): return {}
 return {clean(k):clean(v) for k,v in parsed.items() if isinstance(parsed,dict) and clean(k) and clean(v)} if isinstance(parsed,dict) else {}
def gender(explicit: str, metadata: str, description: str, name: str) -> str:
 def classify(text_:str) -> str|None:
  t=text_.casefold()
  if re.search(r"\b(unisex(?:\s+kids)?|gender[- ]?neutral)\b",t): return "Unisex"
  if re.search(r"\b(boys?|girls?|kids?|infants?|toddlers?|children)\b",t): return "Kids"
  if re.search(r"\b(women|woman|ladies|female|womne)\b",t): return "Women"
  if re.search(r"\b(men|man|mens|male)\b",t): return "Men"
  return None
 # Metadata is used only when it is an actual gender value; arbitrary product
 # attributes can contain incidental terms such as "men" in measurements.
 return classify(explicit) or classify(metadata) or classify(description) or classify(name) or "Unisex"
def label(value_:str) -> str:
 value_=clean(value_)
 return "" if re.fullmatch(r"[0-9.]+",value_) else value_
def category(name:str,description:str,attrs:dict[str,str],hint:str,subhint:str) -> tuple[str,str]:
 t=" ".join((name,description,hint,subhint,*attrs.values())).casefold()
 groups=((("sneaker","shoe","running shoe","loafer","sandal","heel","boot","jutti","slipper","flip flop"),"Footwear"),(("handbag","backpack","trolley","luggage","duffel","sling bag","tote","wallet"),"Bags"),(("necklace","earring","bangle","bracelet","jewellery","jewelry","ring","pendant"),"Jewellery"),(("watch","chronograph","smartwatch"),"Watches"),(("lipstick","serum","foundation","perfume","makeup","shampoo","skincare","moisturiser"),"Beauty"),(("bedsheet","bed sheet","curtain","cushion","towel","rug","blanket"),"Home"),(("track","activewear","sportswear","gym","running","training","yoga","windcheater"),"Sports"),(("belt","cap","scarf","sunglass","stole","hair accessory","sock"),"Accessories"),(("saree","lehenga","kurta","ethnic","anarkali","dupatta","sherwani","salwar"),"Ethnic Wear"),(("shirt","t-shirt","tshirt","top","dress","skirt","jeans","trouser","pants","jacket","hoodie","blazer"),"Apparel"))
 for words,group in groups:
  if any(word in t for word in words): return group,label(subhint) or group
 return label(hint) or "Accessories",label(subhint) or label(hint) or "Accessories"
def color(name:str,description:str,supplied:str) -> str:
 if supplied:return supplied[:50]
 found=re.search(r"\b(black|white|grey|gray|blue|navy blue|green|olive|red|pink|yellow|orange|beige|brown|purple|maroon|gold|silver)\b",f"{name} {description}",re.I)
 return found.group(1).title() if found else "Multicolor"
def tags(name:str,description:str,category_:str,fabric:str) -> tuple[list[str],list[str],list[str],list[str]]:
 t=f"{name} {description} {fabric}".casefold(); occasions={"Casual"}; weather=set(); festivals=set()
 if category_=="Ethnic Wear": occasions|={"Festival","Wedding"}; festivals|={"Diwali","Raksha Bandhan","Janmashtami","Wedding"}
 if any(x in t for x in ("formal","office","blazer","trouser")): occasions.add("Office")
 if any(x in t for x in ("party","gown","heel","sequin")): occasions.add("Party")
 if category_ in {"Sports","Bags","Footwear","Accessories"}: occasions.add("Travel")
 if any(x in t for x in ("cotton","linen","breathable","sleeveless")): weather.add("Summer")
 if any(x in t for x in ("wool","fleece","hoodie","jacket","thermal")): weather.add("Winter")
 if any(x in t for x in ("waterproof","water resistant","quick dry","windcheater","sandal")): weather.add("Rainy Season")
 if not weather:weather.add("All Weather")
 if not festivals and category_ in {"Bags","Footwear","Beauty","Jewellery"}:festivals.add("Wedding")
 return sorted(occasions),sorted(weather),sorted(festivals),[fabric or "Mixed Fabric"]
def open_csv(path:Path):
 if path.suffix.casefold()==".zip":
  archive=zipfile.ZipFile(path); member=next((x for x in archive.infolist() if x.filename.casefold().endswith(".csv")),None)
  if member is None: archive.close(); raise ValueError(f"No CSV file found in {path}")
  return archive,io.TextIOWrapper(archive.open(member),encoding="utf-8-sig",errors="replace",newline="")
 return None,path.open(encoding="utf-8-sig",errors="replace",newline="")
def read_source(path:Path,source:str) -> tuple[list[dict[str,Any]],int]:
 if not path.exists(): raise FileNotFoundError(f"Source CSV not found: {path}")
 archive,stream=open_csv(path)
 try:
  reader=csv.DictReader(stream); columns=field_map(reader.fieldnames or []); missing={"name","brand","price","image"}-columns.keys()
  if missing: raise ValueError(f"{path.name} lacks required mapped fields: {', '.join(sorted(missing))}")
  result=[]
  for row in reader:
   name,brand=value(row,columns,"name"),value(row,columns,"brand"); price=round(number(value(row,columns,"price"))); image=first_image(value(row,columns,"image"))
   if not name or not brand or price<=0 or not image: continue
   desc=value(row,columns,"description"); attrs=attributes(value(row,columns,"attributes")); merch,subcat=category(name,desc,attrs,value(row,columns,"category"),value(row,columns,"subcategory")); metadata_gender=" ".join(v for k,v in attrs.items() if "gender" in k.casefold()); product_gender=gender(value(row,columns,"gender"),metadata_gender,desc,name); supplied_color=value(row,columns,"color"); product_color=color(name,desc,supplied_color); fabric=next((v for k,v in attrs.items() if "fabric" in k.casefold()),""); occasions,weather,festivals,fabrics=tags(name,desc,merch,fabric); sku=value(row,columns,"sku") or value(row,columns,"product_id"); source_id=sku or f"{brand}|{name}|{price}"; rating=max(0,min(5,round(number(value(row,columns,"rating")),2))); reviews=max(0,round(number(value(row,columns,"reviews"))))
   result.append({"id":str(uuid.uuid5(NAMESPACE,f"{source}:{source_id}")),"source_id":source_id,"sku":sku,"name":name[:150],"brand":brand[:100],"description":desc[:4000] or f"{name} by {brand}.","price":price,"currency":value(row,columns,"currency") or "INR","image_url":image,"gender":product_gender if product_gender in VALID_GENDERS else "Unisex","merchandise_category":merch[:80],"subcategory":subcat[:100],"color":product_color,"rating":rating,"reviews":reviews,"original_price":price,"style":"Ethnic" if merch=="Ethnic Wear" else ("Sports" if merch=="Sports" else "Casual"),"sizes":["One Size"] if merch in {"Beauty","Home","Jewellery","Watches","Bags","Accessories"} else ["S","M","L","XL"],"badge":"Top Rated" if rating>=4.4 else None,"colors":[product_color],"occasions":occasions,"fabrics":fabrics,"weather_suitability":weather,"festival_suitability":festivals,"trend_tags":[f"Source: {source}",f"Category: {merch}"],"source_dataset":source})
  return result,len(result)
 finally:
  stream.close()
  if archive:archive.close()
def dedupe(records:list[dict[str,Any]]) -> tuple[list[dict[str,Any]],int]:
 """Merge transitive collision groups using SKU, name+brand, and image URL."""
 parent=list(range(len(records)))
 def find(index:int) -> int:
  while parent[index]!=index:
   parent[index]=parent[parent[index]]; index=parent[index]
  return index
 def union(left:int,right:int) -> None:
  left,right=find(left),find(right)
  if left!=right: parent[right]=left
 keys_seen={}
 for index,record in enumerate(records):
  keys=[f"sku:{record['sku'].casefold()}" if record["sku"] else "",f"name-brand:{record['name'].casefold()}|{record['brand'].casefold()}",f"image:{record['image_url'].casefold()}"]
  for key in keys:
   if key:
    if key in keys_seen: union(index,keys_seen[key])
    keys_seen[key]=index
 groups={}
 for index,record in enumerate(records): groups.setdefault(find(index),[]).append(record)
 merged=[]
 for group in groups.values():
  winner=dict(max(group,key=lambda x:(len(x["description"]),image_quality(x["image_url"]),bool(x["sku"]),x["reviews"],x["rating"])))
  winner["description"]=max((x["description"] for x in group),key=len); winner["image_url"]=max((x["image_url"] for x in group),key=image_quality); winner["rating"]=max(x["rating"] for x in group); winner["reviews"]=max(x["reviews"] for x in group); winner["source_dataset"]=", ".join(sorted({x["source_dataset"] for x in group})); winner["trend_tags"]=[f"Source: {winner['source_dataset']}",f"Category: {winner['merchandise_category']}"]; merged.append(winner)
 return merged,len(records)-len(merged)
def report(records:list[dict[str,Any]],duplicates:int,imported:dict[str,int]):
 genders=Counter(x["gender"] for x in records); categories=Counter(x["merchandise_category"] for x in records); brands=Counter(x["brand"] for x in records)
 print(f"Imported valid products: {dict(sorted(imported.items()))}"); print(f"Total products: {len(records)}"); print("Gender counts: "+", ".join(f"{x}={genders[x]}" for x in ("Men","Women","Unisex","Kids"))); print(f"Category distribution: {dict(sorted(categories.items()))}"); print(f"Top brand distribution: {dict(brands.most_common(20))}"); print(f"Duplicate products removed: {duplicates}")
 for group in ("Men","Women","Unisex","Kids"): print(f"{group} samples: {[x['name'] for x in records if x['gender']==group][:3]}")
def seed(records: list[dict[str, Any]]):
 load_dotenv("apps/api/.env"); url=os.getenv("DATABASE_URL")
 if not url:raise SystemExit("DATABASE_URL is not set in apps/api/.env")
 schema="ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gender VARCHAR(10); ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100); ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_dataset VARCHAR(100); ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency VARCHAR(10);"
 sql=text("INSERT INTO public.products (id,name,category,brand,color,price,style,image_url,original_price,rating,reviews,sizes,description,badge,colors,occasions,fabrics,weather_suitability,festival_suitability,trend_tags,gender,subcategory,source_dataset,currency) VALUES (:id,:name,:category,:brand,:color,:price,:style,:image_url,:original_price,:rating,:reviews,:sizes,:description,:badge,:colors,:occasions,:fabrics,:weather_suitability,:festival_suitability,:trend_tags,:gender,:subcategory,:source_dataset,:currency)")
 rows=[{**x,"category":x["gender"]} for x in records]; database_url=url.replace(":6543/",":5432/"); database_url=("postgresql+psycopg://"+database_url.removeprefix("postgresql://")) if database_url.startswith("postgresql://") else database_url; engine=create_engine(database_url)
 with engine.begin() as c:
  c.execute(text(schema)); c.execute(text("TRUNCATE TABLE public.products CASCADE")); c.execute(sql,rows); inserted=c.execute(text("SELECT COUNT(*) FROM public.products")).scalar_one(); counts=dict(c.execute(text("SELECT gender,COUNT(*) FROM public.products GROUP BY gender ORDER BY gender")).all()); invalid=c.execute(text("SELECT COUNT(*) FROM public.products WHERE gender NOT IN ('Men','Women','Unisex','Kids') OR category IS DISTINCT FROM gender")).scalar_one()
 if inserted!=len(records) or invalid:raise RuntimeError(f"Seed verification failed: inserted={inserted}, expected={len(records)}, invalid_gender_rows={invalid}")
 print(f"Catalog seeding complete: {inserted} rows inserted; database gender counts: {counts}")
def main():
 parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--legacy-source",type=Path,default=DEFAULT_LEGACY_SOURCE); parser.add_argument("--new-source",type=Path,default=DEFAULT_NEW_SOURCE); parser.add_argument("--dry-run",action="store_true"); args=parser.parse_args(); legacy,legacy_count=read_source(args.legacy_source,"Legacy Myntra Dataset"); new,new_count=read_source(args.new_source,"New Myntra Dataset"); records,duplicates=dedupe(legacy+new); report(records,duplicates,{"Legacy Myntra Dataset":legacy_count,"New Myntra Dataset":new_count});
 if not args.dry_run:seed(records)
if __name__=="__main__":main()





