/**
 * Database 2 Project - Order Processing System
 * Client-Side JavaScript Logic (Frontend Controller)
 * 
 * Simplified, lightweight script to handle:
 * 1. Single Page Application (SPA) Tab Navigation.
 * 2. AJAX requests to the Flask REST API.
 * 3. Dynamic HTML Table rendering for database CRUD actions.
 * 4. Dialog forms for adding/editing database rows.
 * 5. Simple client-side text filtering.
 */

// --- GLOBAL APPLICATION STATE ---
let currentTab = 'dashboard'; 
let cachedEntities = {
    customers: [],
    products: [],
    employees: [],
    shippers: []
};

// --- DOM ELEMENT REFERENCES ---
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const addEntryBtn = document.getElementById('add-entry-btn');
const refreshDataBtn = document.getElementById('refresh-data-btn');
const modalContainer = document.getElementById('modal-container');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();      // Setup sidebar menu clicks
    initEventListeners();  // Setup search text fields and modals
    refreshCurrentPanel(); // Load initial page data
});

// --- NAVIGATION & ROUTER ---
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Handle dashboard "quick-link" metrics
    document.querySelectorAll('[data-go-tab]').forEach(el => {
        el.addEventListener('click', () => {
            const tab = el.getAttribute('data-go-tab');
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;
    
    // Highlight sidebar item
    document.querySelectorAll('.menu-item').forEach(item => {
        if (item.getAttribute('data-tab') === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle active panel
    document.querySelectorAll('.content-panel').forEach(panel => {
        if (panel.id === `panel-${tab}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    updateHeader();
    refreshCurrentPanel();
}

function updateHeader() {
    addEntryBtn.style.display = 'none';

    if (currentTab === 'dashboard') {
        pageTitle.innerText = 'System Dashboard';
        pageSubtitle.innerText = 'Database high-level metrics and recent transactions';
    } else if (currentTab === 'customers') {
        pageTitle.innerText = 'Customer Registry';
        pageSubtitle.innerText = 'Table: Customer (CustomerID [PK], CustomerName, Email, Address, City, Postcode, Country)';
        addEntryBtn.style.display = 'inline-flex';
    } else if (currentTab === 'products') {
        pageTitle.innerText = 'Product Inventory';
        pageSubtitle.innerText = 'Table: Products (ProductID [PK], ProductName, Price)';
        addEntryBtn.style.display = 'inline-flex';
    } else if (currentTab === 'employees') {
        pageTitle.innerText = 'Employee Directory';
        pageSubtitle.innerText = 'Table: Employee (EmployeeID [PK], FirstName, LastName, Department)';
        addEntryBtn.style.display = 'inline-flex';
    } else if (currentTab === 'shippers') {
        pageTitle.innerText = 'Shipping Partners';
        pageSubtitle.innerText = 'Table: Shipper (ShipperID [PK], ShipperName, Phone)';
        addEntryBtn.style.display = 'inline-flex';
    } else if (currentTab === 'orders') {
        pageTitle.innerText = 'Order Transactions';
        pageSubtitle.innerText = 'Table: Order (OrderID [PK], OrderDate, TotalAmount, CustomerID [FK], ShipperID [FK], EmployeeID [FK], ProductID [FK])';
        addEntryBtn.style.display = 'inline-flex';
    }
}

// --- EVENT LISTENERS ---
function initEventListeners() {
    refreshDataBtn.addEventListener('click', () => {
        refreshCurrentPanel();
    });

    addEntryBtn.addEventListener('click', () => {
        openAddModal();
    });

    // Setup searching for lists
    setupSearch('search-customers', 'customers-table-body');
    setupSearch('search-products', 'products-table-body');
    setupSearch('search-employees', 'employees-table-body');
    setupSearch('search-shippers', 'shippers-table-body');
    setupSearch('search-orders', 'orders-table-body');

    // Close modal on background clicks
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeModal();
        }
    });
}

function setupSearch(inputId, tbodyId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('keyup', () => {
        const filter = input.value.toLowerCase();
        const rows = document.getElementById(tbodyId).getElementsByTagName('tr');
        for (let row of rows) {
            let found = false;
            const cells = row.getElementsByTagName('td');
            for (let cell of cells) {
                if (cell.classList.contains('actions-col') || cell.classList.contains('cell-actions')) continue;
                if (cell.textContent.toLowerCase().indexOf(filter) > -1) {
                    found = true;
                    break;
                }
            }
            row.style.display = found ? "" : "none";
        }
    });
}

// --- DATA FETCHING & RENDERING ---
function refreshCurrentPanel() {
    if (currentTab === 'dashboard') {
        loadDashboardStats();
    } else {
        loadEntityTable(currentTab);
    }
}

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Populate metrics (SUM, COUNT, AVG aggregates)
        document.getElementById('stat-revenue').innerText = `$${data.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('stat-orders').innerText = data.total_orders;
        document.getElementById('stat-avg-price').innerText = `$${data.avg_product_price.toFixed(2)}`;

        // Populate table counters
        document.getElementById('count-customers').innerText = data.total_customers;
        document.getElementById('count-products').innerText = data.total_products;
        document.getElementById('count-employees').innerText = data.total_employees;
        document.getElementById('count-shippers').innerText = data.total_shippers;

        loadRecentOrdersSummary();
        loadFeaturedProductsSummary();
    } catch (err) {
        console.error("Error loading dashboard metrics:", err);
    }
}

async function loadRecentOrdersSummary() {
    try {
        const res = await fetch('/api/orders');
        const orders = await res.json();
        const tbody = document.querySelector('#dashboard-recent-orders-table tbody');
        tbody.innerHTML = '';
        
        const recent = orders.slice(-5).reverse();
        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center">No orders found</td></tr>';
            return;
        }

        recent.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${o.OrderID}</strong></td>
                <td>${o.CustomerName ? escapeHTML(o.CustomerName) : 'N/A'}</td>
                <td>${o.ProductName ? escapeHTML(o.ProductName) : 'N/A'}</td>
                <td>$${parseFloat(o.TotalAmount).toFixed(2)}</td>
                <td>${formatDate(o.OrderDate)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadFeaturedProductsSummary() {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        const tbody = document.querySelector('#dashboard-featured-products-table tbody');
        tbody.innerHTML = '';
        
        const sorted = [...products].sort((a,b) => b.Price - a.Price).slice(0, 5);
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center">No products found</td></tr>';
            return;
        }

        sorted.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${p.ProductID}</strong></td>
                <td>${escapeHTML(p.ProductName)}</td>
                <td>$${parseFloat(p.Price).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadEntityTable(entity) {
    try {
        const res = await fetch(`/api/${entity}`);
        const list = await res.json();
        if (list.error) throw new Error(list.error);

        if (['customers', 'products', 'employees', 'shippers'].includes(entity)) {
            cachedEntities[entity] = list;
        }

        const tbody = document.getElementById(`${entity}-table-body`);
        tbody.innerHTML = '';

        if (list.length === 0) {
            const cols = document.getElementById(`${entity}-table`).querySelectorAll('th').length;
            tbody.innerHTML = `<tr><td colspan="${cols}" class="text-muted text-center">No records found</td></tr>`;
            return;
        }

        list.forEach(row => {
            const tr = document.createElement('tr');
            tr.id = `row-${entity}-${getEntityId(entity, row)}`;
            tr.innerHTML = getTableRowHTML(entity, row);
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(`Error loading ${entity}:`, err);
    }
}

function getEntityId(entity, row) {
    if (entity === 'customers') return row.CustomerID;
    if (entity === 'products') return row.ProductID;
    if (entity === 'employees') return row.EmployeeID;
    if (entity === 'shippers') return row.ShipperID;
    if (entity === 'orders') return row.OrderID;
}

function getTableRowHTML(entity, row) {
    let cells = '';
    const id = getEntityId(entity, row);

    if (entity === 'customers') {
        cells = `
            <td><strong>#${row.CustomerID}</strong></td>
            <td>${escapeHTML(row.CustomerName)}</td>
            <td>${row.Email ? escapeHTML(row.Email) : '<span class="text-muted">None</span>'}</td>
            <td>${row.Address ? escapeHTML(row.Address) : '<span class="text-muted">None</span>'}</td>
            <td>${row.City ? escapeHTML(row.City) : '<span class="text-muted">None</span>'}</td>
            <td>${row.Postcode ? escapeHTML(row.Postcode) : '<span class="text-muted">None</span>'}</td>
            <td>${row.Country ? escapeHTML(row.Country) : '<span class="text-muted">None</span>'}</td>
        `;
    } else if (entity === 'products') {
        cells = `
            <td><strong>#${row.ProductID}</strong></td>
            <td>${escapeHTML(row.ProductName)}</td>
            <td>$${parseFloat(row.Price).toFixed(2)}</td>
        `;
    } else if (entity === 'employees') {
        cells = `
            <td><strong>#${row.EmployeeID}</strong></td>
            <td>${escapeHTML(row.FirstName)}</td>
            <td>${escapeHTML(row.LastName)}</td>
            <td>${row.Department ? escapeHTML(row.Department) : '<span class="text-muted">None</span>'}</td>
        `;
    } else if (entity === 'shippers') {
        cells = `
            <td><strong>#${row.ShipperID}</strong></td>
            <td>${escapeHTML(row.ShipperName)}</td>
            <td>${row.Phone ? escapeHTML(row.Phone) : '<span class="text-muted">None</span>'}</td>
        `;
    } else if (entity === 'orders') {
        cells = `
            <td><strong>#${row.OrderID}</strong></td>
            <td>${row.CustomerName ? escapeHTML(row.CustomerName) : `<span class="text-muted">ID: ${row.CustomerID}</span>`}</td>
            <td>${row.ProductName ? escapeHTML(row.ProductName) : `<span class="text-muted">ID: ${row.ProductID}</span>`}</td>
            <td>$${parseFloat(row.TotalAmount).toFixed(2)}</td>
            <td>${formatDate(row.OrderDate)}</td>
            <td>${row.EmployeeName ? escapeHTML(row.EmployeeName) : `<span class="text-muted">ID: ${row.EmployeeID}</span>`}</td>
            <td>${row.ShipperName ? escapeHTML(row.ShipperName) : `<span class="text-muted">ID: ${row.ShipperID}</span>`}</td>
        `;
    }

    const actions = `
        <td class="cell-actions">
            <button class="action-btn btn-edit" onclick="openEditModal('${entity}', ${id})" title="Edit">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="action-btn btn-delete" onclick="deleteEntity('${entity}', ${id})" title="Delete">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </td>
    `;
    return cells + actions;
}

// --- CRUD MODALS LOGIC ---
async function openAddModal() {
    modalContainer.style.display = 'flex';
    hideAllModalContents();

    const activeForm = document.getElementById(`modal-${currentTab.slice(0,-1)}`);
    if (activeForm) activeForm.style.display = 'block';

    if (currentTab === 'customers') {
        document.getElementById('customer-modal-title').innerText = 'Add Customer';
        document.getElementById('customer-id').value = '';
        document.getElementById('form-customer').reset();
    } else if (currentTab === 'products') {
        document.getElementById('product-modal-title').innerText = 'Add Product';
        document.getElementById('product-id').value = '';
        document.getElementById('form-product').reset();
    } else if (currentTab === 'employees') {
        document.getElementById('employee-modal-title').innerText = 'Add Employee';
        document.getElementById('employee-id').value = '';
        document.getElementById('form-employee').reset();
    } else if (currentTab === 'shippers') {
        document.getElementById('shipper-modal-title').innerText = 'Add Shipper';
        document.getElementById('shipper-id').value = '';
        document.getElementById('form-shipper').reset();
    } else if (currentTab === 'orders') {
        document.getElementById('order-modal-title').innerText = 'Create Order';
        document.getElementById('order-id').value = '';
        document.getElementById('form-order').reset();
        document.getElementById('order-date').value = new Date().toISOString().substring(0, 10);
        await populateOrderDropdowns();
    }
}

async function openEditModal(entity, id) {
    modalContainer.style.display = 'flex';
    hideAllModalContents();

    const activeForm = document.getElementById(`modal-${entity.slice(0,-1)}`);
    if (activeForm) activeForm.style.display = 'block';

    try {
        const res = await fetch(`/api/${entity}`);
        const list = await res.json();
        const row = list.find(x => getEntityId(entity, x) === id);
        if (!row) return;

        if (entity === 'customers') {
            document.getElementById('customer-modal-title').innerText = 'Edit Customer';
            document.getElementById('customer-id').value = row.CustomerID;
            document.getElementById('customer-name').value = row.CustomerName;
            document.getElementById('customer-email').value = row.Email || '';
            document.getElementById('customer-address').value = row.Address || '';
            document.getElementById('customer-city').value = row.City || '';
            document.getElementById('customer-postcode').value = row.Postcode || '';
            document.getElementById('customer-country').value = row.Country || '';
        } else if (entity === 'products') {
            document.getElementById('product-modal-title').innerText = 'Edit Product';
            document.getElementById('product-id').value = row.ProductID;
            document.getElementById('product-name').value = row.ProductName;
            document.getElementById('product-price').value = row.Price;
        } else if (entity === 'employees') {
            document.getElementById('employee-modal-title').innerText = 'Edit Employee';
            document.getElementById('employee-id').value = row.EmployeeID;
            document.getElementById('employee-firstname').value = row.FirstName;
            document.getElementById('employee-lastname').value = row.LastName;
            document.getElementById('employee-department').value = row.Department || '';
        } else if (entity === 'shippers') {
            document.getElementById('shipper-modal-title').innerText = 'Edit Shipper';
            document.getElementById('shipper-id').value = row.ShipperID;
            document.getElementById('shipper-name').value = row.ShipperName;
            document.getElementById('shipper-phone').value = row.Phone || '';
        } else if (entity === 'orders') {
            document.getElementById('order-modal-title').innerText = 'Edit Order';
            document.getElementById('order-id').value = row.OrderID;
            document.getElementById('order-date').value = row.OrderDate.substring(0, 10);
            document.getElementById('order-amount').value = row.TotalAmount;
            
            await populateOrderDropdowns();
            document.getElementById('order-customer').value = row.CustomerID;
            document.getElementById('order-product').value = row.ProductID;
            document.getElementById('order-employee').value = row.EmployeeID;
            document.getElementById('order-shipper').value = row.ShipperID;
        }
    } catch (err) {
        console.error(err);
    }
}

function closeModal() {
    modalContainer.style.display = 'none';
    hideAllModalContents();
}

function hideAllModalContents() {
    document.getElementById('modal-customer').style.display = 'none';
    document.getElementById('modal-product').style.display = 'none';
    document.getElementById('modal-employee').style.display = 'none';
    document.getElementById('modal-shipper').style.display = 'none';
    document.getElementById('modal-order').style.display = 'none';
}

async function populateOrderDropdowns() {
    const fetches = [
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/shippers').then(r => r.json())
    ];

    try {
        const [customers, products, employees, shippers] = await Promise.all(fetches);

        const custSelect = document.getElementById('order-customer');
        custSelect.innerHTML = '<option value="">-- Select Customer --</option>';
        customers.forEach(c => {
            custSelect.innerHTML += `<option value="${c.CustomerID}">${escapeHTML(c.CustomerName)} (ID: ${c.CustomerID})</option>`;
        });

        const prodSelect = document.getElementById('order-product');
        prodSelect.innerHTML = '<option value="">-- Select Product --</option>';
        products.forEach(p => {
            prodSelect.innerHTML += `<option value="${p.ProductID}" data-price="${p.Price}">${escapeHTML(p.ProductName)} ($${parseFloat(p.Price).toFixed(2)})</option>`;
        });

        const empSelect = document.getElementById('order-employee');
        empSelect.innerHTML = '<option value="">-- Select Employee --</option>';
        employees.forEach(e => {
            empSelect.innerHTML += `<option value="${e.EmployeeID}">${escapeHTML(e.FirstName)} ${escapeHTML(e.LastName)} (ID: ${e.EmployeeID})</option>`;
        });

        const shipSelect = document.getElementById('order-shipper');
        shipSelect.innerHTML = '<option value="">-- Select Shipper --</option>';
        shippers.forEach(s => {
            shipSelect.innerHTML += `<option value="${s.ShipperID}">${escapeHTML(s.ShipperName)} (ID: ${s.ShipperID})</option>`;
        });
    } catch (err) {
        console.error("Error populating dropdowns:", err);
    }
}

function updateOrderTotalAmount() {
    const prodSelect = document.getElementById('order-product');
    const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
    if (selectedOpt && selectedOpt.value) {
        const price = selectedOpt.getAttribute('data-price');
        document.getElementById('order-amount').value = parseFloat(price).toFixed(2);
    } else {
        document.getElementById('order-amount').value = '';
    }
}

// --- SAVE HANDLERS ---
async function saveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('customer-id').value;
    const data = {
        CustomerName: document.getElementById('customer-name').value,
        Email: document.getElementById('customer-email').value || null,
        Address: document.getElementById('customer-address').value || null,
        City: document.getElementById('customer-city').value || null,
        Postcode: document.getElementById('customer-postcode').value || null,
        Country: document.getElementById('customer-country').value || null
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/customers/${id}` : '/api/customers';
    await sendFormData(url, method, data);
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const data = {
        ProductName: document.getElementById('product-name').value,
        Price: parseFloat(document.getElementById('product-price').value)
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/products/${id}` : '/api/products';
    await sendFormData(url, method, data);
}

async function saveEmployee(e) {
    e.preventDefault();
    const id = document.getElementById('employee-id').value;
    const data = {
        FirstName: document.getElementById('employee-firstname').value,
        LastName: document.getElementById('employee-lastname').value,
        Department: document.getElementById('employee-department').value || null
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/employees/${id}` : '/api/employees';
    await sendFormData(url, method, data);
}

async function saveShipper(e) {
    e.preventDefault();
    const id = document.getElementById('shipper-id').value;
    const data = {
        ShipperName: document.getElementById('shipper-name').value,
        Phone: document.getElementById('shipper-phone').value || null
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/shippers/${id}` : '/api/shippers';
    await sendFormData(url, method, data);
}

async function saveOrder(e) {
    e.preventDefault();
    const id = document.getElementById('order-id').value;
    const data = {
        CustomerID: parseInt(document.getElementById('order-customer').value),
        ProductID: parseInt(document.getElementById('order-product').value),
        EmployeeID: parseInt(document.getElementById('order-employee').value),
        ShipperID: parseInt(document.getElementById('order-shipper').value),
        OrderDate: document.getElementById('order-date').value,
        TotalAmount: parseFloat(document.getElementById('order-amount').value) || 0.00
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/orders/${id}` : '/api/orders';
    await sendFormData(url, method, data);
}

async function sendFormData(url, method, data) {
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        
        closeModal();
        refreshCurrentPanel();
    } catch (err) {
        alert("Operation failed: " + err.message);
    }
}

// --- DELETE HANDLER ---
async function deleteEntity(entity, id) {
    if (!confirm(`Are you sure you want to delete this record?`)) return;

    try {
        const res = await fetch(`/api/${entity}/${id}`, {
            method: 'DELETE'
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        
        refreshCurrentPanel();
    } catch (err) {
        alert("Delete failed: " + err.message);
    }
}

// --- UTILITY FUNCTIONS ---
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}
