/* ============================================================
   GPBC — moteur du site : connexion Dimanche (Supabase),
   aides d'affichage, partage réseaux sociaux, affiches de match
   ============================================================ */
'use strict';

// Connexion à la base de l'app Dimanche (lecture publique, vues filtrées GPBC)
const SUPABASE_URL = 'https://hnauzixjohonfujgydzy.supabase.co';
const SUPABASE_CLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYXV6aXhqb2hvbmZ1amd5ZHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjUzMDQsImV4cCI6MjA5OTk0MTMwNH0.fyhbPznxuyp-rkTLF8bRsjnHBjz_V3tmRo4IdsZ6lyo';
const bdd = window.supabase.createClient(SUPABASE_URL, SUPABASE_CLE);

const SITE_URL = 'https://www.gpbc-graveson.fr';

// ---- Contenus libres (textes, liens, coordonnées) ----
let _contenus = null;
async function chargerContenus(){
  if(_contenus) return _contenus;
  const { data } = await bdd.from('site_contenus').select('cle, valeur');
  _contenus = {};
  (data || []).forEach(l => { _contenus[l.cle] = l.valeur || ''; });
  return _contenus;
}

// ---- Formats de dates en français ----
const fmtDate = d => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'})
  .format(new Date(d + 'T12:00:00'));
const fmtDateCourt = d => new Intl.DateTimeFormat('fr-FR', {day:'2-digit', month:'2-digit'})
  .format(new Date(d + 'T12:00:00'));
const fmtHeure = h => h ? h.slice(0,5).replace(':', 'h') : '';
const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ---- Petit toast ----
function toast(msg){
  let t = document.querySelector('.toast');
  if(!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('on'), 2600);
}

// ---- Partage réseaux sociaux (natif si possible, sinon copie du lien) ----
async function partager(titre, texte, url){
  url = url || location.href;
  if(navigator.share){
    try{ await navigator.share({title:titre, text:texte, url}); return; }
    catch(e){ if(e.name === 'AbortError') return; }
  }
  try{
    await navigator.clipboard.writeText(texte + '\n' + url);
    toast('Texte copié — colle-le sur Facebook, Instagram ou WhatsApp !');
  }catch(e){
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
  }
}

// ---- Génération d'affiche (match ou événement) : image 1080x1350 ----
async function genererAffiche(infos){
  // infos : {sur, titre1, titre2, date, heure, lieu, badge}
  await document.fonts.load('90px Anton');
  await document.fonts.load('40px Oswald');
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  // fond nuit + halos club
  x.fillStyle = '#0A0807'; x.fillRect(0, 0, W, H);
  let g = x.createRadialGradient(W*.2, H*.12, 0, W*.2, H*.12, 700);
  g.addColorStop(0, 'rgba(216,35,42,.32)'); g.addColorStop(1, 'rgba(216,35,42,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W*.85, H*.85, 0, W*.85, H*.85, 700);
  g.addColorStop(0, 'rgba(255,201,7,.16)'); g.addColorStop(1, 'rgba(255,201,7,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // lignes de terrain stylisées
  x.strokeStyle = 'rgba(242,237,228,.08)'; x.lineWidth = 5;
  x.beginPath(); x.arc(W/2, H+180, 420, Math.PI, 2*Math.PI); x.stroke();
  x.beginPath(); x.arc(W/2, -140, 380, 0, Math.PI); x.stroke();

  // logo
  const logo = new Image();
  logo.src = 'assets/logo.png';
  await new Promise(r => { logo.complete ? r() : (logo.onload = r, logo.onerror = r); });
  x.drawImage(logo, W/2 - 170, 60, 340, 340);

  x.textAlign = 'center';
  x.fillStyle = '#FFC907';
  x.font = '600 34px Oswald';
  x.fillText((infos.sur || '').toUpperCase(), W/2, 480);

  x.fillStyle = '#F2EDE4';
  x.font = '86px Anton';
  const ligne = (txt, y, taille) => {
    x.font = taille + 'px Anton';
    let t = (txt || '').toUpperCase();
    while(x.measureText(t).width > W - 120 && taille > 34){
      taille -= 4; x.font = taille + 'px Anton';
    }
    x.fillText(t, W/2, y);
  };
  ligne(infos.titre1, 590, 86);
  x.fillStyle = '#D8232A';
  ligne(infos.titre2, 700, 86);

  if(infos.badge){
    x.fillStyle = '#FFC907';
    x.font = '600 30px Oswald';
    const bw = x.measureText(infos.badge.toUpperCase()).width + 60;
    x.fillRect(W/2 - bw/2, 745, bw, 56);
    x.fillStyle = '#181206';
    x.fillText(infos.badge.toUpperCase(), W/2, 784);
  }

  x.fillStyle = '#F2EDE4';
  x.font = '54px Anton';
  x.fillText((infos.date || '').toUpperCase(), W/2, 920);
  x.fillStyle = '#FFC907';
  x.font = '48px Anton';
  x.fillText(infos.heure || '', W/2, 990);
  x.fillStyle = '#B0A99C';
  x.font = '400 34px Oswald';
  x.fillText(infos.lieu || '', W/2, 1055);

  x.strokeStyle = 'rgba(255,201,7,.5)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(W/2 - 140, 1120); x.lineTo(W/2 + 140, 1120); x.stroke();
  x.fillStyle = '#F2EDE4';
  x.font = '600 30px Oswald';
  x.fillText('GRAVESON PROVENCE BASKET CLUB', W/2, 1180);
  x.fillStyle = '#6E685E';
  x.font = '400 26px Oswald';
  x.fillText('www.gpbc-graveson.fr', W/2, 1225);

  return new Promise(res => c.toBlob(res, 'image/png'));
}

// Partage de l'affiche (fichier si possible, sinon téléchargement)
async function partagerAffiche(infos, nomFichier){
  toast('Création de l\'affiche…');
  const blob = await genererAffiche(infos);
  const fichier = new File([blob], (nomFichier || 'affiche-gpbc') + '.png', {type:'image/png'});
  if(navigator.canShare && navigator.canShare({files:[fichier]})){
    try{ await navigator.share({files:[fichier], title:'GPBC Graveson'}); return; }
    catch(e){ if(e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fichier.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Affiche téléchargée — publie-la sur tes réseaux !');
}

// ---- En-tête / pied communs ----
function injecterEntete(actif){
  const pages = [
    ['club.html', 'Le Club'], ['equipes.html', 'Équipes'], ['calendrier.html', 'Calendrier'],
    ['evenements.html', 'Événements'], ['inscription.html', 'Inscription'], ['contact.html', 'Contact'],
  ];
  document.body.insertAdjacentHTML('afterbegin', `
  <header class="entete">
    <a class="marque" href="index.html">
      <img src="assets/logo.png" alt="Logo GPBC">
      <span>
        <span class="marque-nom">GPBC <em>GRAVESON</em></span><br>
        <span class="marque-sub">Provence Basket Club</span>
      </span>
    </a>
    <nav class="nav">
      ${pages.map(([h, n]) => `<a href="${h}" class="${h === actif ? 'actif' : ''}">${n}</a>`).join('')}
    </nav>
  </header>`);
  document.body.insertAdjacentHTML('beforeend', `
  <footer class="pied">
    GPBC — Graveson Provence Basket Club · Club 100 % féminin ·
    <a href="index.html">Accueil</a> · <a href="admin.html">Admin</a><br>
    <span style="opacity:.6">Ballon 3D : iturrospe — Sketchfab (CC) · Site propulsé par l'app Dimanche</span>
  </footer>`);
}
