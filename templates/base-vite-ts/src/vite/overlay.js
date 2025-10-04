(() => {
  const ID = 'vite-error-overlay';
  
  function show(msg) {
    let box = document.getElementById(ID)
    if (!box) {
      box = document.createElement('div');
      box.id = ID;
      box.setAttribute('role', 'alert');
      box.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      `;
      
      const card = document.createElement('div');
      card.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 48px 64px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        max-width: 90%;
      `;
      
      const text = document.createElement('p');
      text.style.cssText = `
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 18px;
        color: rgba(0, 0, 0, 0.5);
        text-align: center;
      `;
      
      card.appendChild(text);
      box.appendChild(card);
      box._textElement = text;
      document.body.appendChild(box);
    }
    box._textElement.textContent = msg;
  }

  if (import.meta.hot) {
    import.meta.hot.on('vite:error', () => show('Preview will be ready shortly'));
    import.meta.hot.on('vite:clear', () => document.getElementById(ID)?.remove());
  }
})();