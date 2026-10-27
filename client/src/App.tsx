import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function Phase0() {
  const [api, setApi] = useState('đang kiểm tra...');

  useEffect(() => {
    fetch('/api/health')
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => setApi(JSON.stringify(data)))
      .catch((error: unknown) => setApi(`LỖI: ${error instanceof Error ? error.message : String(error)}`));
  }, []);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24, lineHeight: 1.7 }}>
      <h1>THD Flipbook: giai đoạn 0</h1>
      <p>API: <code>{api}</code></p>
      <p>Mở thử các tài nguyên reader:</p>
      <ul>
        <li><a href="/assets/templates/default-book-view.html">template html</a></li>
        <li><a href="/assets/css/flipbook/black-book-view.css">black-book-view.css</a></li>
        <li><a href="/assets/css/flipbook/font-awesome.min.css">font-awesome.min.css</a></li>
        <li><a href="/assets/css/images/light-loader.gif">light-loader.gif</a></li>
        <li><a href="/assets/css/fonts/fontawesome-webfont.woff2">fontawesome-webfont.woff2</a></li>
        <li><a href="/assets/sounds/start-flip.mp3">start-flip.mp3</a></li>
      </ul>
    </main>
  );
}

export default function App() {
  return <BrowserRouter><Routes><Route path="*" element={<Phase0 />} /></Routes></BrowserRouter>;
}
