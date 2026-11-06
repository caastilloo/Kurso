// Ventana de escritorio: arranca el servidor local en este proceso y lo muestra.
import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let win = null;

// Los botones de minimizar y cerrar se funden con la app: mismos colores que su tema.
const THEMES = {
  dark: { color: '#0a0a0a', symbolColor: '#fafafa', frame: '#171717' },
  light: { color: '#ffffff', symbolColor: '#0a0a0a', frame: '#fafafa' },
};
const TITLEBAR_HEIGHT = 40;

ipcMain.on('tema', (event, theme) => {
  const t = THEMES[theme];
  if (!t || !win || event.sender !== win.webContents) return;
  win.setTitleBarOverlay({ color: t.color, symbolColor: t.symbolColor, height: TITLEBAR_HEIGHT });
  win.setBackgroundColor(t.frame);
});

const isHttps = (url) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

// Comparar el origen exacto: "empieza por" dejaría pasar localhost:45801 o similares.
const sameOrigin = (a, b) => {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
};

function createWindow(url) {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 560,
    title: 'Kurso',
    icon: path.join(here, '..', 'build', 'icon.png'),
    backgroundColor: THEMES.dark.frame,
    autoHideMenuBar: true,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: THEMES.dark.color, symbolColor: THEMES.dark.symbolColor, height: TITLEBAR_HEIGHT },
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(here, 'preload.cjs'),
    },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => (win = null));

  // Los enlaces a Aules se abren en tu navegador, donde ya tienes la sesión iniciada.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isHttps(target)) shell.openExternal(target);
    return { action: 'deny' };
  });
  // La app no necesita cámara, micrófono, ubicación ni notificaciones: se deniega todo.
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  win.webContents.session.setPermissionCheckHandler(() => false);
  win.webContents.on('will-navigate', (event, target) => {
    if (sameOrigin(target, url)) return;
    event.preventDefault();
    if (isHttps(target)) shell.openExternal(target);
  });
  win.loadURL(url);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    try {
      const { startServer } = await import('../server.js');
      const { url } = await startServer();
      createWindow(url);
    } catch (e) {
      dialog.showErrorBox('No se pudo abrir Kurso', e.message);
      app.quit();
    }
  });

  app.on('window-all-closed', () => app.quit());
}
