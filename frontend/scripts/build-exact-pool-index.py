"""Build a server/offline exact-trio artifact. No sample, season or S-tier filter."""
import gzip,json,argparse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path,default=root/'analysis-snapshots/composition-affinity/pooled-all-trios-2026-10-13.ndjson.gz')
parser.add_argument('--summary',type=Path,default=root/'analysis-snapshots/composition-affinity/pooled-all-trios-2026-10-13-summary.json')
parser.add_argument('--output',type=Path,default=root/'data/pool-recommendations/exact-trios.v1.json.gz')
args=parser.parse_args()
source=args.source.resolve()
summary=json.loads(args.summary.read_text())
rows=[json.loads(line) for line in gzip.open(source,'rt')]
assert len({r['key'] for r in rows})==len(rows)
output=args.output
output.parent.mkdir(parents=True,exist_ok=True)
payload={'version':1,'source':str(source.relative_to(root)) if source.is_relative_to(root) else str(source),'sourceRefreshedAt':summary['sourceRefreshedAt'],'columns':['key','games','wins','rankSum','rp'],'rows':[[r[k] for k in ['key','games','wins','rankSum','rp']] for r in rows]}
output.write_bytes(gzip.compress(json.dumps(payload,separators=(',',':')).encode(),mtime=0))
print(json.dumps({'rows':len(rows),'bytes':output.stat().st_size,'output':str(output)}))
