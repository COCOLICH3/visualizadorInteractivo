const { app, BrowserWindow, session, desktopCapturer } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 650,
    backgroundColor: '#000000',
    title: 'Visualizador de Música — Spike de audio',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');

  // Intercepta el pedido de getDisplayMedia desde el renderer y devuelve
  // el audio del sistema (loopback) en Windows, sin abrir el selector nativo.
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        // Necesitamos una fuente de video para que Chromium acepte el pedido,
        // pero en el renderer descartamos el track de video: solo usamos el audio.
        callback({ video: sources[0], audio: 'loopback' });
      });
    },
    { useSystemPicker: false }
  );
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
