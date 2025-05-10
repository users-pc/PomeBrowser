// Am Anfang der Datei
const { ipcRenderer } = require('electron');

// Warten bis DOM geladen ist
document.addEventListener('DOMContentLoaded', function() {
  // Selektoren für Tab-Elemente
  const tabContainer = document.getElementById('tab-container');
  const newTabButton = document.getElementById('new-tab-button');
  const webviewContainers = document.getElementById('webview-containers');
  const urlBar = document.getElementById('url-bar');
  const backButton = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');
  const reloadButton = document.getElementById('reload-button');
  const goButton = document.getElementById('go-button');
  const incognitoButton = document.getElementById('incognito-button');

  // Tab-Verwaltung
  let tabs = [];
  let activeTabId = null;

  // Initialisierungsfunktion
  function init() {
    console.log('Browser wird initialisiert...');
    
    // Erster Tab beim Start
    createNewTab();
    
    // Event-Listeners für Navigation
    if (goButton) {
      goButton.addEventListener('click', loadURL);
    }
    
    if (urlBar) {
      urlBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          loadURL();
        }
      });
    }
    
    if (backButton) {
      backButton.addEventListener('click', () => {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab && activeTab.webview.canGoBack()) {
          activeTab.webview.goBack();
        }
      });
    }
    
    if (forwardButton) {
      forwardButton.addEventListener('click', () => {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab && activeTab.webview.canGoForward()) {
          activeTab.webview.goForward();
        }
      });
    }
    
    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab) {
          activeTab.webview.reload();
        }
      });
    }
    
    // Event-Listener für neuen Tab
    if (newTabButton) {
      newTabButton.addEventListener('click', () => createNewTab());
    }
    
    console.log('Browser-Initialisierung abgeschlossen.');
  }
  
  // Funktion, um einen neuen Tab zu erstellen
  function createNewTab(url = 'https://www.google.com') {
    console.log('Erstelle neuen Tab mit URL:', url);
    const tabId = 'tab-' + Date.now();
    
    // Tab-Element erstellen
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;
    tab.innerHTML = `
      <div class="tab-title">Neue Seite</div>
      <button class="tab-close" title="Tab schließen">&times;</button>
    `;
    
    // Tab vor dem Plus-Button einfügen
    tabContainer.insertBefore(tab, newTabButton);
    
    // Webview-Container erstellen
    const webviewContainer = document.createElement('div');
    webviewContainer.className = 'webview-container';
    webviewContainer.id = `webview-container-${tabId}`;
    
    // Webview erstellen
    const webview = document.createElement('webview');
    webview.id = `webview-${tabId}`;
    webview.setAttribute('src', url);
    webview.setAttribute('allowpopups', '');
    
    // Webview zum Container hinzufügen
    webviewContainer.appendChild(webview);
    webviewContainers.appendChild(webviewContainer);
    
    // Tab-Objekt erstellen und speichern
    const tabData = {
      id: tabId,
      title: 'Neue Seite',
      url: url,
      element: tab,
      webview: webview,
      container: webviewContainer
    };
    
    tabs.push(tabData);
    
    // Event-Listener für den Tab
    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        activateTab(tabId);
      }
    });
    
    // Event-Listener für Tab schließen
    const closeButton = tab.querySelector('.tab-close');
    closeButton.addEventListener('click', () => closeTab(tabId));
    
    // Webview-Events
    setupWebviewEvents(tabData);
    
    // Tab aktivieren
    activateTab(tabId);
    
    return tabData;
  }

  // Tab aktivieren
  function activateTab(tabId) {
    // Vorherigen aktiven Tab deaktivieren
    if (activeTabId) {
      const oldActiveTab = tabs.find(t => t.id === activeTabId);
      if (oldActiveTab) {
        oldActiveTab.element.classList.remove('active');
        oldActiveTab.container.classList.remove('active');
      }
    }
    
    // Neuen Tab aktivieren
    activeTabId = tabId;
    const activeTab = tabs.find(t => t.id === tabId);
    
    activeTab.element.classList.add('active');
    activeTab.container.classList.add('active');
    
    // URL-Leiste aktualisieren
    urlBar.value = activeTab.url;
    
    // Titel aktualisieren
    document.title = activeTab.title;
  }

  // Tab schließen
  function closeTab(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    // Tab-Element und Webview entfernen
    const tabToClose = tabs[tabIndex];
    tabToClose.element.remove();
    tabToClose.container.remove();
    
    // Aus der Liste entfernen
    tabs.splice(tabIndex, 1);
    
    // Wenn der geschlossene Tab aktiv war, einen anderen aktivieren
    if (tabId === activeTabId) {
      if (tabs.length > 0) {
        // Nächsten oder vorherigen Tab aktivieren
        const newTabIndex = Math.min(tabIndex, tabs.length - 1);
        activateTab(tabs[newTabIndex].id);
      } else {
        // Wenn keine Tabs mehr vorhanden sind, neuen erstellen
        createNewTab();
      }
    }
  }

  // Webview-Events für einen Tab einrichten
  function setupWebviewEvents(tabData) {
    const { webview, id } = tabData;
    
    // Titel aktualisieren
    webview.addEventListener('page-title-updated', (e) => {
      const title = e.title;
      tabData.title = title;
      const titleElement = tabData.element.querySelector('.tab-title');
      titleElement.textContent = title;
      titleElement.title = title;
      
      if (id === activeTabId) {
        document.title = title;
      }
    });
    
    // URL aktualisieren
    webview.addEventListener('did-navigate', (e) => {
      const url = e.url;
      tabData.url = url;
      
      if (id === activeTabId) {
        urlBar.value = url;
      }
    });
    
    // Webview-Error-Handling
    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3 || event.errorCode === -105) {
        showErrorPage(webview, event.validatedURL, "Seite nicht gefunden", 
          "Die angeforderte Webseite konnte nicht gefunden werden.");
      }
    });
  }

  // URL laden im aktiven Tab
  function loadURL() {
    let url = urlBar.value;
    
    if (url.trim() !== '') {
      try {
        // URL-Format überprüfen und korrigieren
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          if (url.includes('.')) {
            url = 'https://' + url;
          } else {
            url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
          }
        }
        
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) {
          console.error('Kein aktiver Tab gefunden!');
          return;
        }
        
        // URL laden
        if (isUrlBlocked(url)) {
          showBlockedMessage(activeTab.webview, url);
        } else {
          activeTab.webview.loadURL(url);
        }
      } catch (error) {
        console.error('Fehler beim Laden der URL:', error);
      }
    }
  }

  // Funktion zur Anzeige einer Warnmeldung bei blockierten URLs
  function showBlockedMessage(webview, blockedUrl) {
    const blockedPage = `
      <html>
        <head>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .blocked-container {
              text-align: center;
              background-color: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 500px;
            }
            h1 { color: #dc3545; }
            .blocked-url { 
              background-color: #f8f9fa;
              padding: 0.5rem;
              border-radius: 4px;
              margin: 1rem 0;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="blocked-container">
            <h1>Zugriff blockiert</h1>
            <p>Der Zugriff auf diese Seite wurde vom Administrator gesperrt.</p>
            <div class="blocked-url">${blockedUrl}</div>
            <button onclick="history.back()">Zurück zur vorherigen Seite</button>
          </div>
        </body>
      </html>
    `;
    
    webview.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(blockedPage)}`);
  }

  // Funktion zur Anzeige von Fehlerseiten
  function showErrorPage(webview, url, title, message) {
    const errorPage = `
      <html>
        <head>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .error-container {
              text-align: center;
              background-color: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 500px;
            }
            h1 { color: #dc3545; }
            .url-display { 
              background-color: #f8f9fa;
              padding: 0.5rem;
              border-radius: 4px;
              margin: 1rem 0;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>${title}</h1>
            <p>${message}</p>
            <div class="url-display">${url}</div>
            <button onclick="history.back()">Zurück zur vorherigen Seite</button>
          </div>
        </body>
      </html>
    `;
    
    webview.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorPage)}`);
  }

  // Rest der Filterlogik
  function isUrlBlocked(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      return blockedDomains.some(blockedDomain => 
        hostname === blockedDomain || 
        hostname.endsWith('.' + blockedDomain)
      );
    } catch (e) {
      console.error('Fehler beim Überprüfen der URL:', e);
      return false;
    }
  }
  
  // Liste der blockierten Domains
  const blockedDomains = [
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'tiktok.com',
  ];

  // Inkognito-Modus
  // Überprüfen, ob Inkognito-Modus aktiv ist
  const urlParams = new URLSearchParams(window.location.search);
  const isIncognito = urlParams.get('incognito') === 'true';

  if (isIncognito) {
    // Inkognito-Styling anwenden
    document.documentElement.classList.add('incognito');
    document.title = 'Inkognito-Modus';
  }

  // Event-Listener für den Inkognito-Button
  if (incognitoButton) {
    incognitoButton.addEventListener('click', () => {
      // Öffne ein neues Fenster im Inkognito-Modus
      ipcRenderer.send('open-incognito');
    });
  }

  // App initialisieren
  init();
});