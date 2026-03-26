

// Configuration & Data
const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor'];
const CATEGORIES = ['Grocery', 'Dairy', 'Beverages', 'Snacks', 'Personal Care', 'Electronics', 'Other'];

// Initialize default items if not in storage
const defaultItems = [
  { name: 'Milk', category: 'Dairy', floor: 'Ground Floor', rack: 'rack1', quantity: 50 },
  { name: 'Bread', category: 'Grocery', floor: 'Ground Floor', rack: 'rack2', quantity: 30 },
  { name: 'Eggs', category: 'Dairy', floor: 'Ground Floor', rack: 'rack3', quantity: 100 },
  { name: 'Rice', category: 'Grocery', floor: 'Ground Floor', rack: 'rack4', quantity: 200 },
  { name: 'Sugar', category: 'Grocery', floor: 'Ground Floor', rack: 'rack5', quantity: 150 },
  { name: 'Battery', category: 'Electronics', floor: '1st Floor', rack: 'rack2', quantity: 45 },
  { name: 'Soap', category: 'Personal Care', floor: '2nd Floor', rack: 'rack5', quantity: 80 }
];

// State
let currentFloor = 'Ground Floor';
let highlightedRackId = null;

// Obfuscated Admin Credentials (Preventing clear-text search)
const _0x1a = 'dGhhcnVzaGFAMTIz'; // tharusha@123
const _0x1b = 'MDAxMTIy';         // 001122
const ADMIN_USER = atob(_0x1a);
const ADMIN_PASS = atob(_0x1b);

// Storage Helpers
const getRackConfig = () => JSON.parse(localStorage.getItem('rackConfig') || '{}');
const saveRackConfig = (cfg) => localStorage.setItem('rackConfig', JSON.stringify(cfg));

const getAdminItems = () => {
  const stored = localStorage.getItem('adminItems');
  if (!stored) {
    // First time load: migrate default items to storage
    localStorage.setItem('adminItems', JSON.stringify(defaultItems));
    return defaultItems;
  }
  return JSON.parse(stored);
};

const saveAdminItems = (items) => localStorage.setItem('adminItems', JSON.stringify(items));
const getAllItems = () => getAdminItems();

const getRacksForFloor = (floor) => {
  const cfg = getRackConfig();
  const count = cfg[floor] || 10;
  return Array.from({ length: count }, (_, i) => ({ id: `rack${i+1}`, label: `Rack ${i+1}` }));
};

// SVG Map Rendering
function createSVGMap(floor = 'Ground Floor', targetRackId = null) {
  const racks = getRacksForFloor(floor);
  const container = document.getElementById('mapContainer');
  
  let svg = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <!-- Floor Outline -->
    <rect x="5" y="5" width="390" height="290" rx="15" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    
    <!-- Entrance -->
    <g transform="translate(200, 290)">
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
        svg += `<path d="M 200 290 Q 200 ${targetY + 20} ${targetX} ${targetY}" 
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
  const items = getAllItems();
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
  const items = getAdminItems();
  tbody.innerHTML = items.map((item, idx) => `
    <tr>
      <td><b>${item.name}</b></td>
      <td>${item.floor.replace(' Floor', '')} / R${item.rack.replace('rack','')}</td>
      <td><input type="number" value="${item.quantity || 0}" min="0" onchange="updateItemQuantity(${idx}, this.value)" style="width: 50px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;"></td>
      <td>${item.image ? `<img src="${item.image}">` : 'No Image'}</td>
      <td><button class="delete-btn" onclick="deleteItem(${idx})">×</button></td>
    </tr>
  `).join('');
}

function updateItemQuantity(idx, val) {
  const items = getAdminItems();
  items[idx].quantity = parseInt(val);
  saveAdminItems(items);
}

function deleteItem(idx) {
  const items = getAdminItems();
  if (confirm('Delete this item?')) {
    items.splice(idx, 1);
    saveAdminItems(items);
    renderAdminTable();
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
  // Initialize Lucide Icons
  if (window.lucide) lucide.createIcons();

  updateFloorSwitcher();
  createSVGMap(currentFloor);
  renderAdminTable();

  // Search
  document.getElementById('searchBar').addEventListener('input', handleSearch);

  // Admin Login
  document.getElementById('adminLoginBtn').onclick = () => document.getElementById('adminLoginModal').classList.add('show');
  document.getElementById('closeAdminLogin').onclick = () => closeModal('adminLoginModal');
  document.getElementById('adminLoginForm').onsubmit = (e) => {
    e.preventDefault();
    const u = document.getElementById('adminUsername').value;
    const p = document.getElementById('adminPassword').value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      closeModal('adminLoginModal');
      document.getElementById('adminDashboardModal').classList.add('show');
    } else {
      document.getElementById('adminLoginError').textContent = 'Invalid credentials';
    }
  };

  // Admin Dashboard
  document.getElementById('closeAdminDashboard').onclick = () => closeModal('adminDashboardModal');
  document.getElementById('closeItemModal').onclick = () => closeModal('itemModal');
  document.getElementById('adminLogoutBtn').onclick = () => closeModal('adminDashboardModal');

  document.getElementById('itemFloor').onchange = updateRackOptions;
  document.getElementById('updateRacksBtn').onclick = () => {
    const floor = document.getElementById('itemFloor').value;
    const count = parseInt(document.getElementById('rackCount').value);
    if (!floor || isNaN(count)) return;
    const cfg = getRackConfig();
    cfg[floor] = count;
    saveRackConfig(cfg);
    updateRackOptions();
    if (floor === currentFloor) createSVGMap(currentFloor);
  };

  document.getElementById('adminForm').onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const floor = document.getElementById('itemFloor').value;
    const rack = document.getElementById('itemRack').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 0;
    const imgFile = document.getElementById('itemImage').files[0];

    const items = getAdminItems();
    const processItem = (imgData = null) => {
      items.push({ name, category, floor, rack, quantity, image: imgData });
      saveAdminItems(items);
      renderAdminTable();
      document.getElementById('adminForm').reset();
      updateRackOptions();
    };

    if (imgFile) {
        const reader = new FileReader();
        reader.onload = (evt) => processItem(evt.target.result);
        reader.readAsDataURL(imgFile);
    } else {
        processItem();
    }
  };

  // Global Click to close modals
  window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
  };
});

