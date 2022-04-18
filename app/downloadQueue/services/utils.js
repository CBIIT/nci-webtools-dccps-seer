import AdmZip from 'adm-zip';
import path from 'path';

export function extractArchive(archivePath, savePath) {
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(savePath);

  return path.join(savePath, path.parse(archivePath).name);
}

export function createArchive(archivePath, savePath) {
  const zip = new AdmZip();
  zip.addLocalFolder(archivePath);
  zip.writeZip(savePath);
  return archivePath + '.zip';
}
