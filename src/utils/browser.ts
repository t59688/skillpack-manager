import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function powershellString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/** Open a URL in the system default browser. */
export async function openUrl(url: string): Promise<void> {
  if (process.platform === "win32") {
    // PowerShell handles URLs with & (classic PAT page query string) reliably.
    await execFileAsync(
      "powershell",
      ["-NoProfile", "-Command", `Start-Process ${JSON.stringify(url)}`],
      { windowsHide: true },
    );
    return;
  }
  if (process.platform === "darwin") {
    await execFileAsync("open", [url]);
    return;
  }
  await execFileAsync("xdg-open", [url]);
}

/** Open a local file or directory with the system default application. */
export async function openPath(targetPath: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync("explorer.exe", [targetPath], { windowsHide: true });
    return;
  }
  if (process.platform === "darwin") {
    await execFileAsync("open", [targetPath]);
    return;
  }
  await execFileAsync("xdg-open", [targetPath]);
}

/** Open a local file or directory in VS Code. */
export async function openInVSCode(targetPath: string): Promise<void> {
  const folderUri = pathToFileURL(targetPath).href;
  if (process.platform === "win32") {
    await execFileAsync(
      "powershell",
      ["-NoProfile", "-Command", `Start-Process -FilePath 'code' -ArgumentList @('--folder-uri', ${powershellString(folderUri)})`],
      { windowsHide: true },
    );
    return;
  }
  await execFileAsync("code", ["--folder-uri", folderUri], { windowsHide: true });
}
