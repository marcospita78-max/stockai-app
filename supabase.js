*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #F7F5F0;
  --surface: #FFFFFF;
  --surface2: #F0EDE6;
  --accent: #1B6CA8;
  --accent-light: #EAF3FB;
  --danger: #C0392B;
  --danger-light: #FDEDEC;
  --success: #27AE60;
  --success-light: #EAFAF1;
  --warning: #D68910;
  --warning-light: #FEF9E7;
  --text: #1A1A1A;
  --text-sec: #5A5A5A;
  --text-muted: #9A9A9A;
  --border: #E2DDD5;
  --radius: 10px;
  --shadow: 0 1px 3px rgba(0,0,0,0.08);
}

html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input, select, textarea {
  font-family: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

/* Scrollbar sutil */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
