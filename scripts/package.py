from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
with ZipFile(root / 'toma-oshikatsu-cloudflare-pages.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted((root / 'dist').rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(root / 'dist'))
print('Created toma-oshikatsu-cloudflare-pages.zip (index.html at ZIP root)')
