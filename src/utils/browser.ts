import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
