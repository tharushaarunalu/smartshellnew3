

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAfD6HHwbq5UTMg90XxbPh-k-0C4nH4vHo",
  authDomain: "mapweb-5f4c0.firebaseapp.com",
  projectId: "mapweb-5f4c0",
  storageBucket: "mapweb-5f4c0.firebasestorage.app",
  messagingSenderId: "632009981025",
  appId: "1:632009981025:web:1257e523014289d45b3e20",
  measurementId: "G-F2FL8BPMTW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
const analytics = firebase.analytics();

// Configuration & Data
const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', 'Store'];
const CATEGORIES = ['Grocery', 'Dairy', 'Beverages', 'Snacks', 'Personal Care', 'Electronics', 'Other'];

// State
let currentFloor = 'Ground Floor';
let highlightedRackId = null;
let allItems = [];
let rackConfig = {};

// Firestore Data Listeners
function initDataSync() {
  // Listen for Items
  db.collection('items').onSnapshot((snapshot) => {
    allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAdminTable();
    if (highlightedRackId) createSVGMap(currentFloor, highlightedRackId);
    else createSVGMap(currentFloor);
  });

  // Listen for Rack Config
  db.collection('settings').doc('rackConfig').onSnapshot((doc) => {
    if (doc.exists) {
      rackConfig = doc.data();
      renderRackConfigSummary();
      createSVGMap(currentFloor, highlightedRackId);
    }
  });
}

// Storage Helpers (Updated for Firebase)
const getRacksForFloor = (floor) => {
  const count = rackConfig[floor] || 10;
  return Array.from({ length: count }, (_, i) => ({ id: `rack${i+1}`, label: `Rack ${i+1}` }));
};

// SVG Map Rendering
function createSVGMap(floor = 'Ground Floor', targetRackId = null) {
  const racks = getRacksForFloor(floor);
  const container = document.getElementById('mapContainer');
  const rows = Math.ceil(racks.length / 2);
  const svgHeight = Math.max(300, rows * 60 + 80);
  
  let svg = `<svg viewBox="0 0 400 ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <!-- Floor Outline -->
    <rect x="5" y="5" width="390" height="${svgHeight - 10}" rx="15" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    
    <!-- Entrance -->
    <g transform="translate(200, ${svgHeight - 10})">
      <circle cx="0" cy="0" r="10" class="entrance-marker"/>
      <text x="0" y="-15" text-anchor="middle" style="font-size: 10px; font-weight: 700; fill: var(--primary);">ENTRANCE</text>
    </g>`;

  // Draw Racks
  racks.forEach((rack, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 40 : 240;
    const y = 30 + row * 50;
    const isHighlighted = rack.id === targetRackId;
    
    svg += `<g class="rack-group" id="group-${rack.id}">
      <rect class="rack ${isHighlighted ? 'highlight' : ''}" id="${rack.id}" 
            x="${x}" y="${y}" width="120" height="35" />
      <text class="rack-label" x="${x + 60}" y="${y + 22}" text-anchor="middle">${rack.label}</text>
    </g>`;
  });

  // Draw Pathfinding Line
  if (targetRackId) {
    const targetEl = racks.find(r => r.id === targetRackId);
    if (targetEl) {
        const idx = racks.indexOf(targetEl);
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const targetX = (col === 0 ? 40 : 240) + 60;
        const targetY = 30 + row * 50 + 35;
        
        // Simple curved path from entrance (200, 290) to rack
        svg += `<path d="M 200 ${svgHeight - 10} Q 200 ${targetY + 20} ${targetX} ${targetY}" 
                      class="path-line" fill="none" />`;
    }
  }

  svg += `</svg>`;
  container.innerHTML = svg;
}

// UI Controllers
function updateFloorSwitcher() {
  const switcher = document.getElementById('floorSwitcher');
  switcher.innerHTML = FLOORS.map(f => `
    <button class="floor-btn ${f === currentFloor ? 'active' : ''}" onclick="switchFloor('${f}')">${f}</button>
  `).join('');
}

function switchFloor(floor) {
  currentFloor = floor;
  highlightedRackId = null;
  updateFloorSwitcher();
  createSVGMap(currentFloor);
  document.getElementById('searchResult').style.display = 'none';
}

function handleSearch() {
  const query = document.getElementById('searchBar').value.trim().toLowerCase();
  const items = allItems;
  const resultDiv = document.getElementById('searchResult');
  
  if (!query) {
    resultDiv.style.display = 'none';
    highlightedRackId = null;
    createSVGMap(currentFloor);
    return;
  }

  const found = items.find(item => item.name.toLowerCase().includes(query));
  
  if (found) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `Found ${found.name} in ${found.rack.replace('rack', 'Rack ')} on the ${found.floor}`;
    
    if (found.floor !== currentFloor) {
      currentFloor = found.floor;
      updateFloorSwitcher();
    }
    
    highlightedRackId = found.rack;
    createSVGMap(currentFloor, found.rack);
    
    // Delayed show modal
    setTimeout(() => showItemModal(found), 800);
  } else {
    resultDiv.style.display = 'block';
    resultDiv.textContent = 'No item found with that name.';
    highlightedRackId = null;
    createSVGMap(currentFloor);
  }
}

function showItemModal(item) {
  const modal = document.getElementById('itemModal');
  const details = document.getElementById('modalDetails');
  details.innerHTML = `
    <h2 style="font-family: 'Outfit';">${item.name}</h2>
    <div style="display: flex; gap: 1rem; margin-top: 1rem; text-align: left;">
        <div style="flex: 1;">
            <p style="margin: 0.2rem 0;"><span style="color: var(--text-muted);">Category:</span> <b>${item.category}</b></p>
            <p style="margin: 0.2rem 0;"><span style="color: var(--text-muted);">Location:</span> <b>${item.floor}</b></p>
            <p style="margin: 0.2rem 0;"><span style="color: var(--text-muted);">Position:</span> <b>${item.rack.replace('rack', 'Rack ')}</b></p>
            <p style="margin: 0.2rem 0;"><span style="color: var(--text-muted);">Stock:</span> <b>${item.quantity || 0} units</b></p>
        </div>
    </div>
    ${item.image ? `<img src="${item.image}" class="item-image" alt="${item.name}">` : ''}
    <button class="btn-primary" style="width: 100%; margin-top: 1.5rem;" onclick="closeModal('itemModal')">Got it!</button>
  `;
  modal.classList.add('show');
}

// Modal Helpers
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Admin Logic
function renderAdminTable() {
  const tbody = document.querySelector('#adminTable tbody');
  const items = allItems;
  tbody.innerHTML = items.map((item) => `
    <tr>
      <td><b>${item.name}</b></td>
      <td>${item.floor.replace(' Floor', '')} / R${item.rack.replace('rack','')}</td>
      <td><input type="number" value="${item.quantity || 0}" min="0" onchange="updateItemQuantity('${item.id}', this.value)" style="width: 50px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;"></td>
      <td>${item.image ? `<img src="${item.image}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">` : 'No Image'}</td>
      <td><button class="delete-btn" onclick="deleteItem('${item.id}')">×</button></td>
    </tr>
  `).join('');
  renderRackConfigSummary();
}

function renderRackConfigSummary() {
  const summaryDiv = document.getElementById('rackConfigSummary');
  if (!summaryDiv) return;
  const cfg = rackConfig;
  summaryDiv.innerHTML = FLOORS.map(f => {
    const count = cfg[f] || 10;
    return `<div style="background: #f1f5f9; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
      <span>${f}</span>
      <b style="color: var(--primary)">${count} Racks</b>
    </div>`;
  }).join('');
}

function updateItemQuantity(id, val) {
  db.collection('items').doc(id).update({ quantity: parseInt(val) });
}

function deleteItem(id) {
  if (confirm('Delete this item?')) {
    db.collection('items').doc(id).delete();
  }
}

function updateRackOptions() {
  const floor = document.getElementById('itemFloor').value;
  const rackSelect = document.getElementById('itemRack');
  rackSelect.innerHTML = '<option value="">Rack</option>';
  if (!floor) return;
  const racks = getRacksForFloor(floor);
  racks.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.id.replace('rack', 'Rack ');
    rackSelect.appendChild(opt);
  });
  document.getElementById('rackCount').value = racks.length;
}

// --- PROTECTIVE DETERRENTS (Prevents easy copying) ---
function initProtection() {
  // Disable Right Click
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Disable F12, Ctrl+Shift+I, Ctrl+U, etc.
  document.onkeydown = function(e) {
    if (e.keyCode == 123) return false; // F12
    if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0))) return false;
    if (e.ctrlKey && (e.keyCode == 'U'.charCodeAt(0) || e.keyCode == 'S'.charCodeAt(0))) return false;
  };

  // Anti-Debugger Trap (Slows down inspectors)
  setInterval(() => {
    (function() { return false; }['constructor']('debugger')['call']());
  }, 100);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initProtection();
  initDataSync(); // Start Firebase Sync

  // Initialize Lucide Icons
  if (window.lucide) lucide.createIcons();

  updateFloorSwitcher();
  createSVGMap(currentFloor);

  // Search
  document.getElementById('searchBar').addEventListener('input', handleSearch);

  // Admin Login
  document.getElementById('adminLoginBtn').onclick = () => document.getElementById('adminLoginModal').classList.add('show');
  document.getElementById('closeAdminLogin').onclick = () => closeModal('adminLoginModal');
  document.getElementById('adminLoginForm').onsubmit = async (e) => {
    e.preventDefault();
    const u = document.getElementById('adminUsername').value;
    const p = document.getElementById('adminPassword').value;
    
    try {
      await auth.signInWithEmailAndPassword(u, p);
      closeModal('adminLoginModal');
      document.getElementById('adminDashboardModal').classList.add('show');
      updateRackOptions();
    } catch (err) {
      document.getElementById('adminLoginError').textContent = 'Invalid credentials or access denied';
    }
  };

  // Admin Dashboard
  document.getElementById('closeAdminDashboard').onclick = () => closeModal('adminDashboardModal');
  document.getElementById('closeItemModal').onclick = () => closeModal('itemModal');
  document.getElementById('adminLogoutBtn').onclick = () => {
    auth.signOut();
    closeModal('adminDashboardModal');
  };

  document.getElementById('itemFloor').onchange = updateRackOptions;
  document.getElementById('updateRacksBtn').onclick = () => {
    const floor = document.getElementById('itemFloor').value;
    const count = parseInt(document.getElementById('rackCount').value);
    if (!floor || isNaN(count)) return;
    
    rackConfig[floor] = count;
    db.collection('settings').doc('rackConfig').set(rackConfig);
    updateRackOptions();
  };

  document.getElementById('adminForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const floor = document.getElementById('itemFloor').value;
    const rack = document.getElementById('itemRack').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 0;
    const imgFile = document.getElementById('itemImage').files[0];

    try {
      let imageUrl = null;
      if (imgFile) {
        const storageRef = storage.ref(`items/${Date.now()}_${imgFile.name}`);
        const snapshot = await storageRef.put(imgFile);
        imageUrl = await snapshot.ref.getDownloadURL();
      }

      await db.collection('items').add({
        name, category, floor, rack, quantity,
        image: imageUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      document.getElementById('adminForm').reset();
      updateRackOptions();
      alert('Item added successfully!');
    } catch (err) {
      console.error(err);
      alert('Error adding item: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add New Item';
    }
  };

  // Global Click to close modals
  window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
  };
});

