const API_BASE = "https://api.escuelajs.co/api/v1";

const state = {
  products: [],
  filtered: [],
  page: 1,
  pageSize: 10,
  sort: { field: null, dir: "asc" },
  search: ""
};

const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const paginationInfo = document.getElementById("paginationInfo");
const countInfo = document.getElementById("countInfo");
const exportCsvBtn = document.getElementById("exportCsvBtn");

const detailModalEl = document.getElementById("detailModal");
const detailForm = document.getElementById("detailForm");
const detailStatus = document.getElementById("detailStatus");
const saveDetailBtn = document.getElementById("saveDetailBtn");
const detailImages = document.getElementById("detailImages");

const createForm = document.getElementById("createForm");
const createStatus = document.getElementById("createStatus");
const createBtn = document.getElementById("createBtn");

function toCurrency(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.classList.toggle("text-danger", isError);
}

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Không tải được dữ liệu");
  const data = await res.json();
  state.products = data;
  applyFilters();
}

function applyFilters() {
  const query = state.search.trim().toLowerCase();
  let data = state.products;

  if (query) {
    data = data.filter((p) => p.title.toLowerCase().includes(query));
  }

  if (state.sort.field) {
    const { field, dir } = state.sort;
    data = [...data].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (typeof aVal === "string") {
        return dir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return dir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  state.filtered = data;
  state.page = 1;
  renderTable();
}

function paginate(data) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  return {
    pageData: data.slice(start, end),
    total,
    totalPages
  };
}

function renderTable() {
  const { pageData, total, totalPages } = paginate(state.filtered);
  tableBody.innerHTML = "";

  if (!pageData.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Không có dữ liệu</td></tr>`;
  } else {
    for (const item of pageData) {
      const tr = document.createElement("tr");
      tr.dataset.id = item.id;
      tr.setAttribute("data-bs-toggle", "tooltip");
      tr.setAttribute("data-bs-placement", "top");
      tr.setAttribute("data-bs-custom-class", "description-tooltip");
      tr.setAttribute("data-bs-title", item.description || "");

      const images = Array.isArray(item.images) ? item.images : [];
      const imageHtml = images[0]
        ? `<img class="image-thumb" src="${images[0]}" alt="image" />`
        : "";

      tr.innerHTML = `
        <td>${item.id}</td>
        <td>${item.title}</td>
        <td>${toCurrency(item.price)}</td>
        <td>${item.category?.name ?? ""}</td>
        <td>${imageHtml}</td>
      `;

      tr.addEventListener("click", () => openDetailModal(item));
      tableBody.appendChild(tr);
    }
  }

  countInfo.textContent = `Tổng ${total} sản phẩm`;
  paginationInfo.textContent = `Trang ${state.page} / ${totalPages}`;
  prevPageBtn.disabled = state.page <= 1;
  nextPageBtn.disabled = state.page >= totalPages;

  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));
}

function handleSort(field, button) {
  const currentDir = button.dataset.dir === "asc" ? "desc" : "asc";
  button.dataset.dir = currentDir;
  state.sort = { field, dir: currentDir };
  renderTable();
}

function openDetailModal(item) {
  detailForm.reset();
  setStatus(detailStatus, "");

  document.getElementById("detailId").value = item.id;
  document.getElementById("detailTitle").value = item.title || "";
  document.getElementById("detailPrice").value = item.price ?? 0;
  document.getElementById("detailDescription").value = item.description || "";
  document.getElementById("detailCategoryId").value = item.category?.id ?? 1;
  document.getElementById("detailImage").value = item.images?.[0] || "";

  detailImages.innerHTML = (item.images || [])
    .map((img) => `<img src="${img}" alt="image" />`)
    .join("");

  const modal = bootstrap.Modal.getOrCreateInstance(detailModalEl);
  modal.show();
}

async function saveDetail() {
  const id = document.getElementById("detailId").value;
  const payload = {
    title: document.getElementById("detailTitle").value.trim(),
    price: Number(document.getElementById("detailPrice").value),
    description: document.getElementById("detailDescription").value.trim(),
    categoryId: Number(document.getElementById("detailCategoryId").value),
    images: [document.getElementById("detailImage").value.trim()]
  };

  try {
    saveDetailBtn.disabled = true;
    setStatus(detailStatus, "Đang cập nhật...");
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Cập nhật thất bại");

    const updated = await res.json();
    const index = state.products.findIndex((p) => p.id === updated.id);
    if (index !== -1) state.products[index] = updated;
    await fetchProducts();
    setStatus(detailStatus, "Cập nhật thành công");
  } catch (err) {
    setStatus(detailStatus, err.message, true);
  } finally {
    saveDetailBtn.disabled = false;
  }
}

async function createItem() {
  const payload = {
    title: document.getElementById("createTitle").value.trim(),
    price: Number(document.getElementById("createPrice").value),
    description: document.getElementById("createDescription").value.trim(),
    categoryId: Number(document.getElementById("createCategoryId").value),
    images: [document.getElementById("createImage").value.trim()]
  };

  try {
    createBtn.disabled = true;
    setStatus(createStatus, "Đang tạo...");
    const res = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Tạo thất bại");

    const created = await res.json();
    await fetchProducts();
    setStatus(createStatus, "Tạo thành công");
    createForm.reset();
  } catch (err) {
    setStatus(createStatus, err.message, true);
  } finally {
    createBtn.disabled = false;
  }
}

function exportCsv() {
  const { pageData } = paginate(state.filtered);
  const headers = ["id", "title", "price", "category", "images"];
  const rows = pageData.map((item) => [
    item.id,
    escapeCsv(item.title),
    item.price,
    escapeCsv(item.category?.name ?? ""),
    escapeCsv((item.images || []).join(" | "))
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "products.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

searchInput.addEventListener("input", (e) => {
  state.search = e.target.value;
  applyFilters();
});

pageSizeSelect.addEventListener("change", (e) => {
  state.pageSize = Number(e.target.value);
  state.page = 1;
  renderTable();
});

prevPageBtn.addEventListener("click", () => {
  state.page -= 1;
  renderTable();
});

nextPageBtn.addEventListener("click", () => {
  state.page += 1;
  renderTable();
});

exportCsvBtn.addEventListener("click", exportCsv);

saveDetailBtn.addEventListener("click", saveDetail);
createBtn.addEventListener("click", createItem);

for (const btn of document.querySelectorAll(".sort-btn")) {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    handleSort(btn.dataset.sort, btn);
  });
}

fetchProducts().catch((err) => {
  tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
});
