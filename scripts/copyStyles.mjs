import { mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';

const copyDir = async (sourceDir, targetDir) => {
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(sourceDir);
  for (const entryName of entries) {
    const sourcePath = path.join(sourceDir, entryName);
    const targetPath = path.join(targetDir, entryName);

    const entryStat = await stat(sourcePath);
    if (entryStat.isDirectory()) {
      await copyDir(sourcePath, targetPath);
      continue;
    }

    await copyFile(sourcePath, targetPath);
  }
};

const run = async () => {
  const sourceStylesDir = path.resolve(process.cwd(), 'src/styles');
  const targetStylesDir = path.resolve(process.cwd(), 'dist/styles');

  await copyDir(sourceStylesDir, targetStylesDir);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
