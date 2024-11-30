import { exec } from 'child_process';

export const openBrowser = (url: string) => {
  const platform = process.platform;
  
  let command: string;
  
  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error, stderr) => {
    if (error) {
      throw error;
    }
    if (stderr) {
      throw new Error(stderr);
    }
  });
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
