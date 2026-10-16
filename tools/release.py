"""Build upload-ready GitHub Release assets from the staged runtime (Python 3)."""
import hashlib
import json
from pathlib import Path
import stat
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'dist' / 'elementsofconflictfoundry'
manifest_bytes = (STAGE / 'system.json').read_bytes()
manifest = json.loads(manifest_bytes)
version, system_id = manifest['version'], manifest['id']
archive_name = f'{system_id}-{version}.zip'
repo = 'https://github.com/geek-io/elementsofconflictfoundry'
assert manifest['manifest'] == f'{repo}/releases/latest/download/system.json'
assert manifest['download'] == f'{repo}/releases/download/v{version}/{archive_name}'
output = ROOT / 'dist' / 'releases' / f'v{version}'
output.mkdir(parents=True, exist_ok=True)
archive_path = output / archive_name
temporary = output / f'{archive_name}.tmp'
allowed = {'system.json', 'scripts', 'styles', 'templates', 'lang', 'README.md',
           'ICON-CREDITS.md', 'LICENSE', 'licenses', 'docs', 'packs', 'assets', 'icons'}
files = sorted(path for path in STAGE.rglob('*') if path.is_file())
assert files and all(path.relative_to(STAGE).parts[0] in allowed for path in files)
assert not any(path.is_symlink() for path in STAGE.rglob('*'))
assert sorted(path.name for path in (STAGE / 'packs').iterdir()) == sorted(pack['name'] for pack in manifest['packs'])
assert sorted(path.name for path in (STAGE / 'scripts').glob('entry-*.mjs')) == [Path(manifest['esmodules'][0]).name]

with ZipFile(temporary, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
    directories = {Path(system_id)}
    for path in files:
        relative = Path(system_id) / path.relative_to(STAGE)
        directories.update(relative.parents)
    for path in sorted(directories):
        if str(path) == '.':
            continue
        info = ZipInfo(path.as_posix() + '/')
        info.create_system = 3
        info.external_attr = (stat.S_IFDIR | 0o755) << 16
        archive.writestr(info, b'')
    for path in files:
        info = ZipInfo((Path(system_id) / path.relative_to(STAGE)).as_posix())
        info.create_system = 3
        info.external_attr = (stat.S_IFREG | 0o644) << 16
        info.compress_type = ZIP_DEFLATED
        archive.writestr(info, path.read_bytes(), compresslevel=6)
temporary.replace(archive_path)
(output / 'system.json').write_bytes(manifest_bytes)

with ZipFile(archive_path) as archive:
    assert archive.testzip() is None, 'Archive CRC verification failed'
    assert archive.read(f'{system_id}/system.json') == manifest_bytes
    names = set(archive.namelist())
    for path in [*manifest['esmodules'], *manifest['styles'], *(lang['path'] for lang in manifest['languages'])]:
        assert f'{system_id}/{path}' in names, f'Missing entry: {path}'
    for info in archive.infolist():
        assert info.external_attr >> 16 & 0o777 == (0o755 if info.is_dir() else 0o644)

checksums = ''.join(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n'
                    for path in [archive_path, output / 'system.json'])
(output / 'SHA256SUMS.txt').write_text(checksums, encoding='utf-8')
readme = (ROOT / 'README.md').read_text(encoding='utf-8')
notes = readme.split(f'# v {version}', 1)[1].split('\n# v ', 1)[0].strip()
(output / 'RELEASE-NOTES.md').write_text(f'# {version}\n\n{notes}\n', encoding='utf-8')
print(f'Release ready: {output}\n{len(files)} runtime files; ZIP CRCs, manifest, paths, and Ubuntu permissions verified.')
