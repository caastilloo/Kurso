// Lo único que la página puede pedirle a la ventana: cambiar el color de sus controles.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kursoDesktop', {
  setTheme: (theme) => ipcRenderer.send('tema', theme),
});
