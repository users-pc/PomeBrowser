const { app, BrowserWindow, globalShortcut, session, ipcMain } = require('electron')
const path = require('path')

let mainWindow = null;
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: false,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  splashWindow.loadFile('splash.html');
  
  // Optional: Open DevTools for debugging
  // splashWindow.webContents.openDevTools()
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
      width: 1500,
      height: 900,
      show: false, // Hide until ready
      webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true // Wichtig für die Verwendung des Webview-Tags
      }
  })

  mainWindow.loadFile('index.html')
  
  // DevTools automatisch beim Start öffnen
  //mainWindow.webContents.openDevTools()
  
  // Auch für das Webview ermöglichen
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
      // Optional: DevTools für das Webview
      // webContents.openDevTools();
      
      // Webview-spezifische Ereignisse behandeln
      webContents.on('did-navigate', (e, url) => {
      console.log('Navigation im Webview zu:', url);
      });
  });
  
  // Tastenkürzel für DevTools registrieren (F12)
  globalShortcut.register('F12', () => {
      // Hauptfenster DevTools umschalten
      if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      } else {
      mainWindow.webContents.openDevTools();
      }
  });

  // Tastenkürzel für Webview DevTools (Umschalt+F12)
  globalShortcut.register('Shift+F12', () => {
      // Webview DevTools umschalten
      mainWindow.webContents.executeJavaScript(`
      const webview = document.getElementById('webview');
      if (webview) {
          if (webview.isDevToolsOpened()) {
          webview.closeDevTools();
          } else {
          webview.openDevTools();
          }
      }
      `);
  });


  // SSL-Fehler im Hauptprozess behandeln
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
      // Akzeptiere alle Zertifikate - HINWEIS: In Produktionsanwendungen 
      // sollten nur bekannte Zertifikate akzeptiert werden
      callback(0) // 0 bedeutet "Erfolg/Akzeptieren"
  });
  
  // Weiterleitungen im Hauptprozess behandeln
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      console.log(`Anfrage an: ${details.url}`);
      callback({}) // Erlaubt die Anfrage ohne Änderungen
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });
}

// Die fehlende Funktion für den Inkognito-Modus
function createIncognitoWindow() {
  // Erstelle eine temporäre, partitionierte Session
  const incognitoSession = session.fromPartition('incognito', { cache: false });
  // Auch für Inkognito-Modus SSL-Fehler ignorieren
  incognitoSession.setCertificateVerifyProc((request, callback) => {
    callback(0) // Akzeptiere alle Zertifikate
  });
  // Weiterleitungen im Inkognito-Modus verarbeiten
  incognitoSession.webRequest.onBeforeRequest((details, callback) => {
    console.log(`Inkognito-Anfrage an: ${details.url}`);
    callback({})
  });
  // Konfiguriere die Inkognito-Session
  incognitoSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Optional: In Inkognito bestimmte Berechtigungen verweigern
    if (permission === 'notifications' || permission === 'geolocation') {
      return callback(false);
    }
    return callback(true);
  });

  // Cookies nur für die aktuelle Session speichern
  incognitoSession.cookies.set({
    httpOnly: true,
    ephemeral: true // Wichtig: Cookies werden nicht dauerhaft gespeichert
  });

  // Inkognito-Fenster erstellen
  const incognitoWin = new BrowserWindow({
    width: 1500,
    height: 900,
    title: 'Inkognito-Modus',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      session: incognitoSession
    }
  });

  // Inkognito-Parameter übergeben
  incognitoWin.loadFile('index.html', { query: { 'incognito': 'true' } });
  
  // Inkognito-Stil und -Titel
  incognitoWin.webContents.on('did-finish-load', () => {
    incognitoWin.webContents.executeJavaScript(`
      document.title = 'Inkognito-Modus';
      document.documentElement.classList.add('incognito');
    `);
  });

  // Session bereinigen, wenn das Fenster geschlossen wird
  incognitoWin.on('closed', () => {
    incognitoSession.clearStorageData();
    incognitoSession.clearCache();
  });
}

// IPC-Handler für Browser starten
ipcMain.on('start-browser', () => {
  createWindow();
});

// IPC-Handler für Inkognito-Modus
ipcMain.on('open-incognito', () => {
  createIncognitoWindow();
});

// Consolidated app.whenReady() block - remove the duplicate one
app.whenReady().then(() => {
  createSplashWindow();
  
  // Automatically start main window after a delay
  setTimeout(() => {
    createWindow();
  }, 3500); // 3.5 seconds delay
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
});

app.on('will-quit', () => {
  // Tastenkürzel beim Beenden freigeben
  globalShortcut.unregisterAll();
});