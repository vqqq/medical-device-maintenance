// renderer.js
const { ipcRenderer } = require('electron');

let devices = [];
let filteredDevices = [];
let deleteDeviceIndex = -1;
let currentDeviceId = null;
let filteredRecords = [];
let deleteRecordDeviceIndex = null;
let deleteRecordIndex = -1;

// === 添加/编辑设备 ===
function openAddDeviceModal() {
  document.getElementById('deviceModalTitle').textContent = '添加设备';
  document.getElementById('deviceId').value = '';
  document.getElementById('deviceName').value = '';
  document.getElementById('deviceModel').value = '';
  document.getElementById('deviceModal').style.display = 'block';
}

function openEditDeviceModal(deviceId) {
  const device = devices.find(d => d.id === deviceId);
  if (!device) return;

  document.getElementById('deviceModalTitle').textContent = '编辑设备';
  document.getElementById('deviceId').value = deviceId;
  document.getElementById('deviceName').value = device.name;
  document.getElementById('deviceModel').value = device.model;
  document.getElementById('deviceModal').style.display = 'block';
}

function closeDeviceModal() {
  document.getElementById('deviceModal').style.display = 'none';
}

function saveDevice() {
  const id = document.getElementById('deviceId').value;
  const name = document.getElementById('deviceName').value;
  const model = document.getElementById('deviceModel').value;

  if (!name || !model) {
    openAlertModal('请填写所有字段');
    return;
  }

  if (id === '') {
    const newId = devices.length ? Math.max(...devices.map(d => d.id)) + 1 : 1;
    devices.push({ id: newId, name, model, maintenanceRecords: [] });
  } else {
    const index = devices.findIndex(d => d.id === parseInt(id));
    devices[index] = { ...devices[index], name, model };
  }

  closeDeviceModal();
  renderDevices();
  searchDevices();
  // 自动保存
  ipcRenderer.send('save-data', devices);
}

// === 删除设备 ===
function openDeleteDeviceModal(deviceId) {
  deleteDeviceIndex = deviceId;
  document.getElementById('deviceDeleteModal').style.display = 'block';
}

function closeDeleteDeviceModal() {
  document.getElementById('deviceDeleteModal').style.display = 'none';
  deleteDeviceIndex = -1;
}

function confirmDeviceDelete() {
  if (deleteDeviceIndex !== -1) {
    devices = devices.filter(d => d.id !== deleteDeviceIndex);
    renderDevices();
    searchDevices();
    // 自动保存
    ipcRenderer.send('save-data', devices);
  }
  closeDeleteDeviceModal();
}

// === 搜索设备 ===
function searchDevices() {
  const query = document.getElementById('deviceSearchInput').value.toLowerCase();
  filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(query) ||
    device.model.toLowerCase().includes(query) ||
    device.maintenanceRecords.some(record =>
      record.date.toLowerCase().includes(query) ||
      record.details.toLowerCase().includes(query)
    )
  );
  renderDevices(filteredDevices);
}

function clearDeviceSearch() {
  document.getElementById('deviceSearchInput').value = '';
  filteredDevices = devices;
  renderDevices();
}

// === 渲染设备 ===
function renderDevices(data = devices) {
  const tbody = document.getElementById('deviceTableBody');
  tbody.innerHTML = '';
  data.forEach(device => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${device.name}</td>
      <td>${device.model}</td>
      <td>
        <button onclick="openEditDeviceModal(${device.id})">编辑</button>
        <button onclick="openDeleteDeviceModal(${device.id})">删除</button>
        <button onclick="openRecordsModal(${device.id})">维护记录</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  bindSearchEvent('deviceSearchInput', searchDevices);
}


// === 建立维护记录 ===
function openRecordsModal(deviceId) {
  currentDeviceId = deviceId;
  filteredRecords = []; // 初始化搜索结果
  const device = devices.find(d => d.id === deviceId);
  if (!device) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'recordsModal';
  modal.innerHTML = `
    <div class="record-modal-content">
      <h3>${device.name} 的维护记录</h3>
      <button onclick="openAddRecordModal(${deviceId})" class="add-btn">添加记录</button>
      <div class="search-container">
        <input id="recordSearchInput" placeholder="搜索维护日期或详情">
        <button onclick="clearRecordSearch(${deviceId})" class="cancel-btn">清空</button>
      </div>
      <div class="record-table-container">
        <table id="recordTable">
          <thead>
            <tr>
              <th>维护日期</th>
              <th>维护详情</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="recordTableBody"></tbody>
        </table>
      </div>
      <div>
        <button onclick="closeRecordsModal()" class="cancel-btn">关闭</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'block';
  renderRecords(deviceId);
}

function closeRecordsModal() {
  const modal = document.getElementById('recordsModal');
  if (modal) {
    modal.remove();
  }
  currentDeviceId = null;
  filteredRecords = [];
}

// === 添加/编辑维护记录 ===
function openAddRecordModal(deviceId) {
  document.getElementById('recordModalTitle').textContent = '添加维护记录';
  document.getElementById('recordDeviceId').value = deviceId;
  document.getElementById('recordId').value = '';
  document.getElementById('recordDate').value = '';
  document.getElementById('recordDetails').value = '';
  document.getElementById('recordModal').style.display = 'block';
}

function openEditRecordModal(deviceId, recordId) {
  const device = devices.find(d => d.id === deviceId);
  if (!device) return;

  const record = device.maintenanceRecords.find(r => r.recordId === recordId);
  if (!record) return;

  document.getElementById('recordModalTitle').textContent = '编辑维护记录';
  document.getElementById('recordDeviceId').value = deviceId;
  document.getElementById('recordId').value = recordId;
  document.getElementById('recordDate').value = record.date;
  document.getElementById('recordDetails').value = record.details;
  document.getElementById('recordModal').style.display = 'block';
}

function closeRecordModal() {
  document.getElementById('recordModal').style.display = 'none';
}

function saveRecord() {
  const deviceId = parseInt(document.getElementById('recordDeviceId').value);
  const recordId = document.getElementById('recordId').value;
  const date = document.getElementById('recordDate').value;
  const details = document.getElementById('recordDetails').value;

  if (!date || !details) {
    openAlertModal('请填写所有字段');
    return;
  }

  const device = devices.find(d => d.id === deviceId);
  if (!device) return;

  if (recordId === '') {
    const newRecordId = device.maintenanceRecords.length
      ? Math.max(...device.maintenanceRecords.map(r => r.recordId)) + 1
      : 1;
    device.maintenanceRecords.push({ recordId: newRecordId, date, details });
  } else {
    const index = device.maintenanceRecords.findIndex(r => r.recordId === parseInt(recordId));
    device.maintenanceRecords[index] = { recordId: parseInt(recordId), date, details };
  }

  closeRecordModal();
  renderRecords(deviceId);
  searchRecords(deviceId);
  // 自动保存
  ipcRenderer.send('save-data', devices);
}

// === 删除维护记录 ===
function openDeleteRecordModal(deviceId, recordId) {
  deleteRecordDeviceIndex = deviceId;
  deleteRecordIndex = recordId;
  document.getElementById('recordDeleteModal').style.display = 'block';
}

function closeDeleteRecordModal() {
  document.getElementById('recordDeleteModal').style.display = 'none';
  deleteRecordDeviceIndex = null;
  deleteRecordIndex = -1;
}

function confirmRecordDelete() {
  if (deleteRecordDeviceIndex !== null && deleteRecordIndex !== -1) {
    const device = devices.find(d => d.id === deleteRecordDeviceIndex);
    if (device) {
      device.maintenanceRecords = device.maintenanceRecords.filter(r => r.recordId !== deleteRecordIndex);
      renderRecords(deleteRecordDeviceIndex, filteredRecords.length ? filteredRecords : null);
      searchRecords(deleteRecordDeviceIndex);
      // 自动保存
      ipcRenderer.send('save-data', devices);
    }
  }
  closeDeleteRecordModal();
}

// === 搜索功维护记录 ===
function searchRecords(deviceId) {
  const query = document.getElementById('recordSearchInput').value.toLowerCase();
  const device = devices.find(d => d.id === deviceId);
  if (!device) return;

  filteredRecords = device.maintenanceRecords.filter(record =>
    record.date.toLowerCase().includes(query) ||
    record.details.toLowerCase().includes(query)
  );
  renderRecords(deviceId, filteredRecords);
}

function clearRecordSearch(deviceId) {
  document.getElementById('recordSearchInput').value = '';
  filteredRecords = [];
  renderRecords(deviceId);
}

// === 渲染维护记录 ===
function renderRecords(deviceId, records = null) {
  const device = devices.find(d => d.id === deviceId);
  if (!device) return;

  const tbody = document.getElementById('recordTableBody');
  if (!tbody) return;

  // 使用过滤后的记录或所有记录
  const displayRecords = records || device.maintenanceRecords;
  tbody.innerHTML = '';
  displayRecords.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.date}</td>
      <td>${record.details}</td>
      <td>
        <button onclick="openEditRecordModal(${deviceId}, ${record.recordId})">编辑</button>
        <button onclick="openDeleteRecordModal(${deviceId}, ${record.recordId})">删除</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  bindSearchEvent('recordSearchInput', () => searchRecords(deviceId));
}


// === 警告 ===
function openAlertModal(message) {
  document.getElementById('alertMessage').textContent = message;
  document.getElementById('alertModal').style.display = 'block';
}

function closeAlertModal() {
  document.getElementById('alertModal').style.display = 'none';
}

// === 绑定搜索 ===
function bindSearchEvent(inputId, searchFunction) {
  const searchInput = document.getElementById(inputId);
  if (!searchInput) return;

  let debounceTimer;
  searchInput.removeEventListener('input', searchFunction);
  function searchHandler() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => searchFunction(), 50);
  }
  searchInput.addEventListener('input', searchHandler);
}


// === 导入数据 ===
function openImportData() {
  ipcRenderer.send('import-data');
}

// === 导出数据 ===
function openExportData() {
  ipcRenderer.send('export-data', devices);
}

// === 关于软件 ===
function openAboutSoftwareModal(data) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'aboutSoftwareModal';
  modal.style.zIndex = '5000';
  modal.innerHTML = `
    <div class="alert-modal-content">
      <h3>关于软件</h3>
        <p>应用程序版本: ${data.appVersion}</p>
        <p>Electron 版本: ${data.electronVersion}</p>
      <div>
        <button onclick="closeAboutSoftwareModal()">确定</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'block';
}

function closeAboutSoftwareModal() {
  const modal = document.getElementById('aboutSoftwareModal');
  if (modal) {
    modal.remove();
  }
}

// === 关于我 ===
function openAboutAuthorModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'aboutAuthorModal';
  modal.style.zIndex = '5000';
  modal.innerHTML = `
    <div class="alert-modal-content">
      <h3>关于作者</h3>
      <p>姓名：张涵</p>
      <p>微信：zzihhi</p>
      <p>邮箱：zhanghanem@163.com</p>
      <div>
        <button onclick="closeAboutAuthorModal()">确定</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'block';
}

function closeAboutAuthorModal() {
  const modal = document.getElementById('aboutAuthorModal');
  if (modal) {
    modal.remove();
  }
}


// === IPC 监听 ===
ipcRenderer.on('load-initial-data', (event, data) => {
  devices = data;
  renderDevices();
  searchDevices();
});
ipcRenderer.on('open-import-data', openImportData);
ipcRenderer.on('import-data-result', (event, result) => {
  if (result.success) {
    devices = result.data;
    renderDevices();
    searchDevices();
    openAlertModal(result.message);
    // 自动保存
    ipcRenderer.send('save-data', devices);
  } else {
    openAlertModal(result.message);
  }
});
ipcRenderer.on('open-export-data', openExportData);
ipcRenderer.on('export-data-result', (event, result) => {
  openAlertModal(result.message);
});
ipcRenderer.on('open-about-software', (event, data) => openAboutSoftwareModal(data));
ipcRenderer.on('open-about-author', openAboutAuthorModal);


// 初始化：渲染设备
renderDevices();