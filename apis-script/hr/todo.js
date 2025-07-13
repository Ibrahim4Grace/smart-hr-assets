import { hrService } from '../../../services/hr-service.js';
import { handleManualFormSubmission, showStatus, setButtonState } from '../../../utils/utils.js';

// Cache DOM elements
const DOM = {
    addTodoForm: null,
    editTodoForm: null,
    deleteModal: null,
    statusMessage: null,
    todoTableBody: null,
    todoTablePagination: null
};

// CSS styles (unchanged, but moved to top for clarity)
const style = document.createElement('style');
style.textContent = `
    .image-preview-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
    }
    .image-preview-item {
        position: relative;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.3s ease;
    }
    .image-preview-item:hover {
        border-color: #007bff;
        transform: scale(1.05);
    }
    .image-preview-img {
        display: block;
        width: 100px;
        height: 100px;
        object-fit: cover;
    }
    .delete-image-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .delete-image-btn:hover {
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);

// Memoization cache
const memoCache = new Map();

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility function to clear todo-related caches
function clearTodoCache() {
    const cacheKeys = Array.from(memoCache.keys());
    cacheKeys.forEach(key => {
        if (key.startsWith('todos_') || key.startsWith('todo_')) {
            memoCache.delete(key);
        }
    });
    // Also clear the grouped cache to ensure fresh data
    memoCache.delete('todos_grouped');
}



// Enhanced cache invalidation function
function invalidateTodoCache(todoId = null) {
    console.log('Invalidating cache for todo:', todoId);

    // Clear all todo-related caches
    const cacheKeys = Array.from(memoCache.keys());
    cacheKeys.forEach(key => {
        if (key.startsWith('todos_') ||
            key.startsWith('todo_') ||
            key === 'hrEmployees' ||
            key === 'todos_grouped') {
            memoCache.delete(key);
            console.log('Cleared cache key:', key);
        }
    });

    // Also clear table pagination caches
    const tableCacheKeys = Array.from(memoCache.keys());
    tableCacheKeys.forEach(key => {
        if (key.startsWith('todos_table_')) {
            memoCache.delete(key);
            console.log('Cleared table cache key:', key);
        }
    });
}

// Enhanced success handler for updates
async function handleUpdateSuccess(todoId) {
    console.log('Handling update success for todo:', todoId);

    // 1. Clear all caches first
    invalidateTodoCache(todoId);

    // 2. Force refresh the grouped data
    try {
        const response = await hrService.getTodosGroupedByPriority();
        const groupedTodos = response.data || { High: [], Medium: [], Low: [] };
        memoCache.set('todos_grouped', groupedTodos);
        console.log('Refreshed grouped todos cache');
    } catch (err) {
        console.error('Failed to refresh grouped todos:', err);
    }

    // 3. Hide modal
    bootstrap.Modal.getInstance(document.getElementById('edit_todo')).hide();

    // 4. Refresh all views
    await loadTodosByPriority('All');

    if (isTodoListPage()) {
        await loadTodosTable(1, true);
    }

    // 5. Update task counts
    await updateTaskCounts();

    console.log('Update success handling complete');
}

// Optimistic update function for immediate UI feedback
function updateTodoInCache(todoId, updatedData) {
    console.log('Performing optimistic update for todo:', todoId);

    // Update the individual todo cache
    const todoCache = memoCache.get(`todo_${todoId}`);
    if (todoCache) {
        Object.assign(todoCache, updatedData);
        memoCache.set(`todo_${todoId}`, todoCache);
    }

    // Update grouped cache
    const groupedCache = memoCache.get('todos_grouped');
    if (groupedCache) {
        for (const priority in groupedCache) {
            const todos = groupedCache[priority];
            const todoIndex = todos.findIndex(t => t.id === todoId);
            if (todoIndex !== -1) {
                // If priority changed, move to new group
                if (updatedData.priority && updatedData.priority !== priority) {
                    // Remove from old priority
                    todos.splice(todoIndex, 1);
                    // Add to new priority
                    if (!groupedCache[updatedData.priority]) {
                        groupedCache[updatedData.priority] = [];
                    }
                    groupedCache[updatedData.priority].push({ ...todos[todoIndex], ...updatedData });
                } else {
                    // Update in same priority
                    Object.assign(todos[todoIndex], updatedData);
                }
                break;
            }
        }
        memoCache.set('todos_grouped', groupedCache);
    }
}

// Optimized image upload and preview
function initializeImageUpload(inputElement, previewContainerId) {
    const previewContainer = document.getElementById(previewContainerId);

    const handleChange = debounce((e) => {
        const files = Array.from(e.target.files);
        previewContainer.innerHTML = '';

        files.forEach((file, index) => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Image Preview" class="image-preview-img">
                    <button type="button" class="btn btn-danger btn-sm delete-image-btn" data-index="${index}">
                        <i class="ti ti-x"></i>
                    </button>
                `;
                previewContainer.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }, 100);

    inputElement.addEventListener('change', handleChange);

    previewContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-image-btn');
        if (!deleteBtn) return;

        const index = parseInt(deleteBtn.dataset.index);
        const previewItem = deleteBtn.closest('.image-preview-item');
        previewItem.remove();

        const dt = new DataTransfer();
        Array.from(inputElement.files).forEach((file, i) => {
            if (i !== index) dt.items.add(file);
        });
        inputElement.files = dt.files;
    });
}

// Initialize DOM elements
function initDOM() {
    DOM.addTodoForm = document.querySelector('#add_todo form');
    DOM.editTodoForm = document.querySelector('#edit_todo form');
    DOM.deleteModal = document.querySelector('#delete_modal a.btn-danger');
    DOM.statusMessage = document.getElementById('statusMessage');
    DOM.todoTableBody = document.getElementById('todoTableBody');
    DOM.todoTablePagination = document.getElementById('todoTablePagination');
}

document.addEventListener('DOMContentLoaded', () => {
    initDOM();

    // Initialize Select2 for add modal
    const initAddModal = async () => {
        const addImageInput = document.querySelector('#add_todo input[name="todo_image"]');
        initializeImageUpload(addImageInput, 'add-image-preview');

        const cacheKey = 'hrEmployees';
        let assignees = memoCache.get(cacheKey);
        if (!assignees) {
            const response = await hrService.getHrEmployees();
            assignees = response.data || [];
            memoCache.set(cacheKey, assignees);
        }

        const $select = $('#add_todo .select2-assignee');
        if ($select.hasClass('select2-hidden-accessible')) {
            $select.select2('destroy');
        }

        $select.empty().append('<option value="">Select</option>');
        if (assignees.length > 0) {
            const fragment = document.createDocumentFragment();
            assignees.forEach(name => {
                fragment.appendChild(new Option(name, name, false, false));
            });
            $select.append(fragment);
        }

        $select.select2({
            tags: true,
            placeholder: 'Select or type a name',
            allowClear: true,
            dropdownParent: $('#add_todo'),
            width: '100%'
        });
    };

    document.querySelector('#add_todo').addEventListener('show.bs.modal', initAddModal);

    // Initialize Select2 for edit modal
    const initEditModal = async () => {
        const editImageInput = document.querySelector('#edit_todo input[name="todo_image"]');
        initializeImageUpload(editImageInput, 'edit-image-preview');

        await populateEditAssigneeDropdown();

        const $editSelect = $('#edit_todo select[name="assigned_to"]');
        if ($editSelect.hasClass('select2-hidden-accessible')) {
            $editSelect.select2('destroy');
        }
        $editSelect.select2({
            tags: true,
            placeholder: 'Select or type a name',
            allowClear: true,
            dropdownParent: $('#edit_todo'),
            width: '100%'
        });
    };

    document.querySelector('#edit_todo').addEventListener('show.bs.modal', initEditModal);

    // Create Todo
    handleManualFormSubmission({
        form: DOM.addTodoForm,
        button: DOM.addTodoForm.querySelector('button[type="submit"]'),
        statusMessage: DOM.statusMessage,
        // In your form validation
        onValidate: (data) => {
            if (!data.title?.trim()) throw new Error('Todo Title is required');
            if (!data.tag || data.tag === 'Select') throw new Error('Tag is required');
            if (!data.priority || data.priority === 'Select') throw new Error('Priority is required');
            if (!data.status || data.status === 'Select') throw new Error('Status is required');
            data.description = DOM.addTodoForm.querySelector('textarea[name="description"]').value;
            data.assigned_to = $('#add_todo .select2-assignee').val();
            if (!data.assigned_to) throw new Error('Assignee is required');
            return data;
        },
        onSubmit: async (formData) => {
            const imageInput = DOM.addTodoForm.querySelector('input[name="todo_image"]');
            // Only add the image file if present and has size > 0
            if (imageInput.files.length > 0 && imageInput.files[0].size > 0) {
                formData.todo_image = imageInput.files[0];
            } else {
                delete formData.todo_image;
            }
            // Pass plain object to service
            return await hrService.createTodo(formData);
        },
        successMessage: 'Todo created successfully!',
        onSuccess: () => {
            invalidateTodoCache();
            bootstrap.Modal.getInstance(document.getElementById('add_todo')).hide();
            loadTodosByPriority('All');
            if (isTodoListPage()) {
                loadTodosTable(1, true);
            }
            updateTaskCounts();
        },
    });

    // Update Todo
    handleManualFormSubmission({
        form: DOM.editTodoForm,
        button: DOM.editTodoForm.querySelector('button[type="submit"]'),
        statusMessage: DOM.statusMessage,
        onValidate: (data) => {
            if (!data.title?.trim()) throw new Error('Todo Title is required');
            if (!data.tag || data.tag === 'Select') throw new Error('Tag is required');
            if (!data.priority || data.priority === 'Select') throw new Error('Priority is required');
            if (!data.status || data.status === 'Select') throw new Error('Status is required');
            data.description = DOM.editTodoForm.querySelector('textarea[name="description"]').value;
            return data;
        },
        onSubmit: async (formData) => {
            const todoId = DOM.editTodoForm.dataset.todoId;
            const imageInput = DOM.editTodoForm.querySelector('input[name="todo_image"]');
            // Only add the image file if present and has size > 0
            if (imageInput.files.length > 0 && imageInput.files[0].size > 0) {
                formData.todo_image = imageInput.files[0];
            } else {
                delete formData.todo_image;
            }

            // Optimistic update for immediate UI feedback
            updateTodoInCache(todoId, formData);
            // Immediately refresh UI
            loadTodosByPriority('All');
            if (isTodoListPage()) {
                loadTodosTable(1, true);
            }

            // Pass plain object to service
            return await hrService.updateTodo(todoId, formData);
        },
        successMessage: 'Todo updated successfully!',
        onSuccess: async (response) => {
            const todoId = DOM.editTodoForm.dataset.todoId;
            console.log('Update success callback triggered for todo:', todoId);

            // Use the enhanced success handler
            await handleUpdateSuccess(todoId);
            // const todoId = DOM.editTodoForm.dataset.todoId;
            // invalidateTodoCache(todoId);

            // bootstrap.Modal.getInstance(document.getElementById('edit_todo')).hide();

            // memoCache.delete('todos_grouped');
            // loadTodosByPriority('All', true);
            // if (isTodoListPage()) {
            //     loadTodosTable(1, true);
            // }
            // updateTaskCounts();
        },
    });

    // Delete Todo
    DOM.deleteModal.addEventListener('click', async () => {
        const todoId = DOM.deleteModal.dataset.todoId;
        try {
            setButtonState(DOM.deleteModal, true, 'Deleting...');
            await hrService.deleteTodo(todoId);
            showStatus(DOM.statusMessage, 'Todo deleted successfully!', false);

            invalidateTodoCache();
            bootstrap.Modal.getInstance(DOM.deleteModal.closest('.modal')).hide();
            loadTodosByPriority('All');
            if (isTodoListPage()) {
                loadTodosTable(1, true);
            }
            updateTaskCounts();
        } catch (err) {
            showStatus(DOM.statusMessage, `Failed to delete todo: ${err.message}`, true);
        } finally {
            setButtonState(DOM.deleteModal, false, 'Yes, Delete');
        }
    });

    // Tab Event Listeners
    const tabMap = {
        'pills-home': 'All',
        'pills-contact': 'High',
        'pills-medium': 'Medium',
        'pills-low': 'Low',
    };

    const debouncedLoadTodos = debounce(loadTodosByPriority, 200);

    document.querySelectorAll('.todo-tabs button[data-bs-toggle="pill"]').forEach((tabBtn) => {
        tabBtn.addEventListener('shown.bs.tab', (e) => {
            const targetId = e.target.getAttribute('data-bs-target').replace('#', '');
            const priority = tabMap[targetId];
            debouncedLoadTodos(priority);
        });
    });

    async function loadTodosByPriority(priority) {
        try {
            const targetElement = priority === 'All' ? document.getElementById('todoList-All') : document.getElementById(`todoList-${priority}`);
            if (!targetElement) {
                console.warn(`Target element not found for priority: ${priority}`);
                return;
            }

            // Show loading state
            targetElement.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Loading todos...</p></div>';

            if (priority === 'All') {
                // Use grouped endpoint for better performance
                const cacheKey = 'todos_grouped';
                let groupedTodos = memoCache.get(cacheKey);

                if (!groupedTodos) {
                    const response = await hrService.getTodosGroupedByPriority();
                    groupedTodos = response.data || { High: [], Medium: [], Low: [] };
                    memoCache.set(cacheKey, groupedTodos);
                }

                let allTodosHtml = '';
                for (const p of ['High', 'Medium', 'Low']) {
                    allTodosHtml += renderTodoGroup(p, groupedTodos[p] || []);
                }

                targetElement.innerHTML = allTodosHtml;
                attachEventListeners('todoList-All');
            } else {
                // For individual priority tabs, use the grouped data if available, otherwise fetch individually
                const cacheKey = 'todos_grouped';
                let groupedTodos = memoCache.get(cacheKey);

                if (groupedTodos && groupedTodos[priority]) {
                    // Use cached grouped data
                    targetElement.innerHTML = renderTodoGroup(priority, groupedTodos[priority]);
                } else {
                    // Fallback to individual API call
                    const cacheKey = `todos_${priority}`;
                    let todos = memoCache.get(cacheKey);

                    if (!todos) {
                        const response = await hrService.getTodosByPriority(priority);
                        todos = response.data || [];
                        memoCache.set(cacheKey, todos);
                    }

                    targetElement.innerHTML = renderTodoGroup(priority, todos);
                }

                attachEventListeners(`todoList-${priority}`);
            }
        } catch (err) {
            console.error('Error loading todos:', err);
            const targetElement = priority === 'All' ? document.getElementById('todoList-All') : document.getElementById(`todoList-${priority}`);
            if (targetElement) {
                targetElement.innerHTML = '<div class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i><p class="mt-2">Failed to load todos</p></div>';
            }
            showStatus(DOM.statusMessage, `Failed to load todos: ${err.message}`, true);
        }
    }

    // Utility to check if we are on the todo-list page
    function isTodoListPage() {
        return window.location.pathname.includes('todo-list');
    }

    // Table-related functions
    if (isTodoListPage()) {
        function renderTodoTableRow(todo) {
            const starIcon = todo.priority === 'High' ? 'ti ti-star-filled filled' :
                todo.priority === 'Medium' ? 'ti ti-star-filled' : 'ti ti-star';
            const squareColor = todo.priority === 'High' ? 'text-purple' :
                todo.priority === 'Medium' ? 'text-warning' : 'text-danger';
            const tagBadge = {
                'Internal': 'badge-danger',
                'Projects': 'badge-info',
                'Meetings': 'badge-purple',
                'Reminder': 'badge-primary'
            }[todo.tag] || 'badge-info';
            const statusBadge = {
                'Completed': 'badge-soft-success',
                'Pending': 'badge-soft-dark',
                'Inprogress': 'bg-transparent-purple'
            }[todo.status] || 'badge-soft-success';

            const avatarsHtml = Array.isArray(todo.assigned_to)
                ? todo.assigned_to.map(a => `
                    <span class="avatar avatar-rounded">
                        <img class="border border-white" src="${a.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" alt="img">
                    </span>`).join('')
                : `<span class="avatar avatar-rounded">
                    <img class="border border-white" src="${todo.todo_image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" alt="img">
                </span>`;

            // Add optimistic styling for table rows
            const optimisticClass = todo.isOptimistic ? 'optimistic-todo' : '';
            const optimisticIndicator = todo.isOptimistic ? '<span class="badge badge-info me-2"><i class="ti ti-loader ti-spin"></i> Saving...</span>' : '';
            const disabledAttr = todo.isOptimistic ? 'disabled' : '';

            return `
                <tr class="${optimisticClass}">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="form-check form-check-md">
                                <input class="form-check-input" type="checkbox" ${disabledAttr}>
                            </div>
                            <span class="mx-2 d-flex align-items-center rating-select"><i class="${starIcon}"></i></span>
                            <span class="d-flex align-items-center"><i class="ti ti-square-rounded ${squareColor} me-2"></i></span>
                        </div>
                    </td>
                    <td>
                        <p class="fw-medium text-dark">${todo.title}</p>
                        ${optimisticIndicator}
                    </td>
                    <td><p class="fw-medium text-dark">${todo.description.length > 20 ? todo.description.slice(0, 20) + '...' : todo.description}</p></td>
                    <td><span class="badge ${tagBadge}">${todo.tag}</span></td>
                    <td><p class="fw-medium text-dark">${Array.isArray(todo.assigned_to) ? todo.assigned_to.join(', ') : todo.assigned_to}</p></td>
                    <td>${todo.created_at ? new Date(todo.created_at).toLocaleDateString() : ''}</td>
                    <td>
                        <span class="badge ${statusBadge} d-inline-flex align-items-center">
                            <i class="ti ti-circle-filled fs-5 me-1"></i>${todo.status}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <a href="#" class="btn btn-sm btn-icon edit-btn" data-id="${todo.id}" data-bs-toggle="modal" data-bs-target="#edit_todo" ${todo.isOptimistic ? 'style="pointer-events: none; opacity: 0.5;"' : ''}>
                                <i class="ti ti-edit"></i>
                            </a>
                            <a href="#" class="btn btn-sm btn-icon delete-btn" data-id="${todo.id}" data-bs-toggle="modal" data-bs-target="#delete_modal" ${todo.isOptimistic ? 'style="pointer-events: none; opacity: 0.5;"' : ''}>
                                <i class="ti ti-trash"></i>
                            </a>
                            <a href="#" class="btn btn-sm btn-icon view-btn" data-id="${todo.id}" data-bs-toggle="modal" data-bs-target="#view_todo" ${todo.isOptimistic ? 'style="pointer-events: none; opacity: 0.5;"' : ''}>
                                <i class="ti ti-eye"></i>
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }

        function renderPagination(meta) {
            const { page, totalPages } = meta;
            let html = '<nav aria-label="Page navigation example"><ul class="pagination justify-content-center">';
            html += `<li class="page-item${page === 1 ? ' disabled' : ''}">
                        <a class="page-link" href="#" aria-label="Previous" data-page="${page - 1}">
                            <span aria-hidden="true">«</span>
                            <span class="sr-only">Previous</span>
                        </a>
                    </li>`;
            for (let i = 1; i <= totalPages; i++) {
                html += `<li class="page-item${i === page ? ' active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>`;
            }
            html += `<li class="page-item${page === totalPages ? ' disabled' : ''}">
                        <a class="page-link" href="#" aria-label="Next" data-page="${page + 1}">
                            <span aria-hidden="true">»</span>
                            <span class="sr-only">Next</span>
                        </a>
                    </li>`;
            html += '</ul></nav>';
            return html;
        }

        async function loadTodosTable(page = 1, forceRefresh = false) {
            try {
                const cacheKey = `todos_table_${page}`;
                let tableContent = memoCache.get(cacheKey);

                if (!tableContent || forceRefresh) {
                    const response = await hrService.getTodos({ page });
                    const todos = response.data || [];
                    const meta = response.meta || { page: 1, totalPages: 1 };

                    tableContent = {
                        body: todos.map(renderTodoTableRow).join(''),
                        pagination: renderPagination(meta)
                    };
                    memoCache.set(cacheKey, tableContent);
                }

                if (DOM.todoTableBody) {
                    DOM.todoTableBody.innerHTML = tableContent.body;
                }
                if (DOM.todoTablePagination) {
                    DOM.todoTablePagination.innerHTML = tableContent.pagination;
                }

                attachTableEventListeners();

                // Store meta for pagination
                const response = await hrService.getTodos({ page });
                const meta = response.meta || { page: 1, totalPages: 1 };

                document.querySelectorAll('#todoTablePagination .page-link').forEach((link) => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const newPage = parseInt(link.getAttribute('data-page'));
                        if (!isNaN(newPage) && newPage !== meta.page && newPage > 0 && newPage <= meta.totalPages) {
                            loadTodosTable(newPage);
                        }
                    });
                });
            } catch (err) {
                showStatus(DOM.statusMessage, `Failed to load todos table: ${err.message}`, true);
            }
        }

        function attachTableEventListeners() {
            if (!DOM.todoTableBody) return;

            const handleClick = (e) => {
                const btn = e.target.closest('.edit-btn, .delete-btn, .view-btn');
                if (!btn) return;

                const todoId = btn.dataset.id;
                console.log('Table button clicked:', btn.className, 'Todo ID:', todoId);

                if (btn.classList.contains('edit-btn')) {
                    console.log('Table edit button clicked');
                    populateEditForm(todoId);
                } else if (btn.classList.contains('delete-btn')) {
                    console.log('Table delete button clicked');
                    DOM.deleteModal.dataset.todoId = todoId;
                    bootstrap.Modal.getInstance(document.getElementById('delete_modal')).show();
                } else if (btn.classList.contains('view-btn')) {
                    console.log('Table view button clicked');
                    populateViewModal(todoId);
                }
            };

            DOM.todoTableBody.removeEventListener('click', handleClick);
            DOM.todoTableBody.addEventListener('click', handleClick);
        }

        loadTodosTable();
    }

    function renderTodoItem(todo, priority) {
        const avatarsHtml = Array.isArray(todo.assigned_to)
            ? todo.assigned_to.map(a => `<span class="avatar avatar-rounded"><img class="border border-white" src="${a.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" alt="img"></span>`).join('')
            : `<span class="avatar avatar-rounded"><img class="border border-white" src="${todo.todo_image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" alt="img"></span>`;

        return `
            <div class="list-group-item list-item-hover shadow-sm rounded mb-2 p-3" data-todo-id="${todo.id}">
                <div class="row align-items-center row-gap-3">
                    <div class="col-lg-6 col-md-7">
                        <div class="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                            <span class="me-2 d-flex align-items-center"><i class="ti ti-grid-dots text-dark"></i></span>
                            <div class="form-check form-check-md me-2">
                                <input class="form-check-input" type="checkbox">
                            </div>
                            <span class="me-2 rating-select d-flex align-items-center">
                                <i class="ti ti-star${priority === 'High' ? '-filled filled' : ''}"></i>
                            </span>
                            <div class="strike-info">
                                <h4 class="fs-14">${todo.title}</h4>
                            </div>
                            <span class="badge bg-transparent-dark text-dark rounded-pill ms-2">
                                <i class="ti ti-clock me-1"></i>
                               ${todo.created_at ? new Date(todo.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                            </span>
                        </div>
                    </div>
                    <div class="col-lg-6 col-md-5">
                        <div class="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                            ${todo.tag ? `<span class="badge badge-success me-3">${todo.tag}</span>` : ''}
                            ${todo.status ? `<span class="badge ${todo.status === 'Completed' ? 'badge-soft-success' : todo.status === 'Onhold' ? 'bg-soft-pink' : 'badge-info'} d-inline-flex align-items-center me-3"><i class="fas fa-circle fs-6 me-1"></i>${todo.status}</span>` : ''}
                            <div class="avatar-list-stacked avatar-group-sm">
                                ${avatarsHtml}
                            </div>
                            <div class="dropdown ms-2">
                                <a href="javascript:void(0);" class="d-inline-flex align-items-center" data-bs-toggle="dropdown">
                                    <i class="ti ti-dots-vertical"></i>
                                </a>
                                <ul class="dropdown-menu dropdown-menu-end p-3">
                                    <li><a href="javascript:void(0);" class="dropdown-item rounded-1 edit-btn" data-id="${todo.id}"><i class="ti ti-edit me-2"></i>Edit</a></li>
                                    <li><a href="javascript:void(0);" class="dropdown-item rounded-1 delete-btn" data-id="${todo.id}"><i class="ti ti-trash me-2"></i>Delete</a></li>
                                    <li><a href="javascript:void(0);" class="dropdown-item rounded-1 view-btn" data-id="${todo.id}"><i class="ti ti-eye me-2"></i>View</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTodoGroup(priority, todos) {
        const priorityMap = {
            High: { icon: 'text-purple', badge: 'bg-light', chevron: 'fas fa-chevron-down', color: 'purple' },
            Medium: { icon: 'text-warning', badge: 'bg-light', chevron: 'fas fa-chevron-down', color: 'orange' },
            Low: { icon: 'text-success', badge: 'bg-light', chevron: 'fas fa-chevron-down', color: 'green' },
        };
        const { icon, badge, chevron } = priorityMap[priority] || priorityMap['High'];
        const collapseId = `collapse-${priority}`;
        const headingId = `heading-${priority}`;

        return `
            <div class="accordion todo-accordion">
                <div class="accordion-item mb-3">
                    <div class="row align-items-center mb-3 row-gap-3">
                        <div class="col-lg-4 col-sm-6">
                            <div class="accordion-header" id="${headingId}">
                                <div class="accordion-button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-controls="${collapseId}">
                                    <div class="d-flex align-items-center w-100">
                                        <div class="me-2">
                                            <a href="javascript:void(0);"><span><i class="${chevron}"></i></span></a>
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <span><i class="ti ti-square-rounded ${icon} me-2"></i></span>
                                            <h5 class="fw-semibold">${priority}</h5>
                                            <span class="badge ${badge} rounded-pill ms-2">${todos.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-8 col-sm-6">
                            <div class="d-flex align-items-center justify-content-sm-end">
                                <a href="#" class="btn btn-light me-2" data-bs-toggle="modal" data-bs-target="#add_todo"><i class="ti ti-circle-plus me-2"></i>Add New</a>
                                <a href="todo-list" class="btn btn-outline-light border">See All <i class="ti ti-arrow-right ms-2"></i></a>
                            </div>
                        </div>
                    </div>
                    <div id="${collapseId}" class="accordion-collapse collapse show" aria-labelledby="${headingId}">
                        <div class="accordion-body">
                            <div class="list-group list-group-flush">
                                ${todos.map((todo) => renderTodoItem(todo, priority)).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function populateEditForm(todoId) {
        try {
            const cacheKey = `todo_${todoId}`;
            let todo = memoCache.get(cacheKey);
            if (!todo) {
                const response = await hrService.findTodoById(todoId);
                todo = response.data || response;
                memoCache.set(cacheKey, todo);
            }

            DOM.editTodoForm.dataset.todoId = todoId;
            DOM.editTodoForm.querySelector('input[name="title"]').value = todo.title || '';
            DOM.editTodoForm.querySelector('select[name="tag"]').value = todo.tag || '';
            DOM.editTodoForm.querySelector('select[name="priority"]').value = todo.priority || '';
            DOM.editTodoForm.querySelector('textarea[name="description"]').value = todo.description || '';
            DOM.editTodoForm.querySelector('select[name="status"]').value = todo.status || '';

            const editImagePreview = document.getElementById('edit-image-preview');
            if (editImagePreview) {
                editImagePreview.innerHTML = '';
                if (todo.todo_image) {
                    const images = Array.isArray(todo.todo_image) ? todo.todo_image : [todo.todo_image].filter(url => url.trim());
                    images.forEach(imageUrl => {
                        const previewItem = document.createElement('div');
                        previewItem.className = 'image-preview-item';
                        previewItem.innerHTML = `
                            <img src="${imageUrl}" alt="Existing Image" class="image-preview-img">
                            <button type="button" class="btn btn-danger btn-sm delete-image-btn" data-existing-image="${imageUrl}">
                                <i class="ti ti-x"></i>
                            </button>
                        `;
                        editImagePreview.appendChild(previewItem);
                    });
                }
            }

            await populateEditAssigneeDropdown();
            const assigneeSelect = DOM.editTodoForm.querySelector('select[name="assigned_to"]');
            assigneeSelect.value = Array.isArray(todo.assigned_to) ? todo.assigned_to[0] : todo.assigned_to || '';

            bootstrap.Modal.getOrCreateInstance(document.getElementById('edit_todo')).show();
        } catch (err) {
            showStatus(DOM.statusMessage, `Failed to load todo details: ${err.message}`, true);
        }
    }

    async function populateViewModal(todoId) {
        try {
            const cacheKey = `todo_${todoId}`;
            let todo = memoCache.get(cacheKey);
            if (!todo) {
                const response = await hrService.findTodoById(todoId);
                todo = response.data || response;
                memoCache.set(cacheKey, todo);
            }

            const viewModal = document.querySelector('#view_todo');
            if (!viewModal) {
                console.error('View modal not found');
                return;
            }

            // Set title
            const titleElement = viewModal.querySelector('.todo-title');
            if (titleElement) {
                titleElement.textContent = todo.title || 'Todo Details';
            }

            // Set created date
            const createdAtElement = viewModal.querySelector('.todo-created-at');
            if (createdAtElement) {
                createdAtElement.textContent = todo.created_at
                    ? new Date(todo.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'N/A';
            }

            // Set priority
            const priorityBadge = viewModal.querySelector('.todo-priority');
            if (priorityBadge) {
                const priorityConfig = {
                    High: { text: 'High', class: 'badge-danger' },
                    Medium: { text: 'Medium', class: 'badge-warning' },
                    Low: { text: 'Low', class: 'badge-success' }
                }[todo.priority] || { text: 'Normal', class: 'badge-secondary' };

                priorityBadge.textContent = priorityConfig.text;
                priorityBadge.className = `badge d-inline-flex align-items-center todo-priority ${priorityConfig.class}`;
            }

            // Set status
            const statusBadge = viewModal.querySelector('.todo-status');
            if (statusBadge) {
                const statusConfig = {
                    Completed: 'badge-soft-success',
                    Pending: 'badge-soft-dark',
                    Onhold: 'bg-soft-pink',
                    Inprogress: 'badge-info'
                }[todo.status] || 'badge-soft-success';

                statusBadge.innerHTML = `<i class="fas fa-circle fs-6 me-1"></i>${todo.status || 'N/A'}`;
                statusBadge.className = `badge d-inline-flex align-items-center todo-status ${statusConfig}`;
            }

            // Set description
            const descriptionElement = viewModal.querySelector('.todo-description');
            if (descriptionElement) {
                descriptionElement.textContent = todo.description || 'No description';
            }

            // Set images
            const imagesContainer = viewModal.querySelector('.todo-images');
            if (imagesContainer) {
                imagesContainer.innerHTML = '';
                if (todo.todo_image) {
                    const images = Array.isArray(todo.todo_image) ? todo.todo_image : [todo.todo_image].filter(url => url.trim());
                    images.forEach(imageUrl => {
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.alt = 'Todo Image';
                        img.style = 'width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #e9ecef; margin-right: 8px; margin-bottom: 8px;';
                        imagesContainer.appendChild(img);
                    });
                }
            }

            // Set tags
            const tagsContainer = viewModal.querySelector('.todo-tags');
            if (tagsContainer) {
                tagsContainer.innerHTML = '';
                const tagColors = {
                    Internal: 'badge-danger',
                    Projects: 'badge-success',
                    Reminder: 'badge-secondary',
                    Meetings: 'badge-info'
                };
                if (todo.tag) {
                    const tags = Array.isArray(todo.tag) ? todo.tag : [todo.tag];
                    tags.forEach(tag => {
                        const span = document.createElement('span');
                        span.className = `badge me-2 ${tagColors[tag] || 'badge-secondary'}`;
                        span.textContent = tag;
                        tagsContainer.appendChild(span);
                    });
                }
            }

            // Set assignees
            const assigneesContainer = viewModal.querySelector('.todo-assigned-to');
            const assignedLabel = viewModal.querySelector('.todo-assigned-label');
            if (assigneesContainer && assignedLabel) {
                assigneesContainer.innerHTML = '';
                if (todo.assigned_to) {
                    const assignees = Array.isArray(todo.assigned_to) ? todo.assigned_to : [todo.assigned_to];
                    assignedLabel.textContent = assignees.join(', ');
                    assignees.forEach(a => {
                        const avatar = document.createElement('span');
                        avatar.className = 'avatar avatar-rounded';
                        avatar.innerHTML = typeof a === 'object' && a.avatar
                            ? `<img class="border border-white" src="${a.avatar}" alt="img">`
                            : a && typeof a === 'string'
                                ? a.split(' ').map(w => w[0]).join('').toUpperCase()
                                : 'U';
                        assigneesContainer.appendChild(avatar);
                    });
                } else {
                    assignedLabel.textContent = 'Unassigned';
                    const avatar = document.createElement('span');
                    avatar.className = 'avatar avatar-rounded';
                    avatar.textContent = 'U';
                    assigneesContainer.appendChild(avatar);
                }
            }

            // Set delete button handler
            const viewDeleteBtn = viewModal.querySelector('.delete-btn');
            if (viewDeleteBtn) {
                viewDeleteBtn.onclick = (e) => {
                    e.preventDefault();
                    DOM.deleteModal.dataset.todoId = todo.id;
                    bootstrap.Modal.getOrCreateInstance(document.getElementById('delete_modal')).show();
                };
            }

            // Show the modal
            console.log('About to show modal:', viewModal);
            const modalInstance = bootstrap.Modal.getOrCreateInstance(viewModal);
            console.log('Modal instance:', modalInstance);
            modalInstance.show();
            console.log('Modal show() called');

        } catch (err) {
            console.error('Error in populateViewModal:', err);
            showStatus(DOM.statusMessage, `Failed to load todo details: ${err.message}`, true);
        }
    }

    function attachEventListeners(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const handleClick = (e) => {
            const btn = e.target.closest('.edit-btn, .delete-btn, .view-btn');
            if (!btn) return;

            const todoId = btn.dataset.id || btn.closest('.list-group-item').dataset.todoId;
            console.log('Button clicked:', btn.className, 'Todo ID:', todoId);

            if (btn.classList.contains('edit-btn')) {
                console.log('Edit button clicked');
                populateEditForm(todoId);
            } else if (btn.classList.contains('delete-btn')) {
                console.log('Delete button clicked');
                DOM.deleteModal.dataset.todoId = todoId;
                bootstrap.Modal.getInstance(document.getElementById('delete_modal')).show();
            } else if (btn.classList.contains('view-btn')) {
                console.log('View button clicked');
                populateViewModal(todoId);
            }
        };

        container.removeEventListener('click', handleClick);
        container.addEventListener('click', handleClick);
    }

    async function populateEditAssigneeDropdown() {
        try {
            const cacheKey = 'hrEmployees';
            let assignees = memoCache.get(cacheKey);
            if (!assignees) {
                const response = await hrService.getHrEmployees();
                assignees = response.data || [];
                memoCache.set(cacheKey, assignees);
            }

            const assigneeSelect = DOM.editTodoForm.querySelector('select[name="assigned_to"]');
            const fragment = document.createDocumentFragment();
            fragment.appendChild(new Option('Select', ''));
            assignees.forEach(name => {
                fragment.appendChild(new Option(name, name));
            });
            assigneeSelect.innerHTML = '';
            assigneeSelect.appendChild(fragment);
        } catch (err) {
            showStatus(DOM.statusMessage, `Failed to load assignees: ${err.message}`, true);
        }
    }

    // Add this function to update the task counts - Optimized to use grouped data
    async function updateTaskCounts() {
        try {
            // Try to use cached grouped data first
            const cacheKey = 'todos_grouped';
            let groupedTodos = memoCache.get(cacheKey);

            if (!groupedTodos) {
                // If not cached, fetch grouped data
                const response = await hrService.getTodosGroupedByPriority();
                groupedTodos = response.data || { High: [], Medium: [], Low: [] };
                memoCache.set(cacheKey, groupedTodos);
            }

            // Combine all todos from all priorities
            const allTodos = [
                ...(groupedTodos.High || []),
                ...(groupedTodos.Medium || []),
                ...(groupedTodos.Low || [])
            ];

            const total = allTodos.length;
            const pending = allTodos.filter(todo => todo.status === 'Pending').length;
            const completed = allTodos.filter(todo => todo.status === 'Completed').length;

            // Update UI elements if they exist
            const totalElement = document.getElementById('totalTaskCount');
            const pendingElement = document.getElementById('pendingTaskCount');
            const completedElement = document.getElementById('completedTaskCount');

            if (totalElement) totalElement.textContent = total;
            if (pendingElement) pendingElement.textContent = pending;
            if (completedElement) completedElement.textContent = completed;

        } catch (err) {
            console.error('Error updating task counts:', err);
            // Fallback to individual API calls if grouped endpoint fails
            try {
                const priorities = ['High', 'Medium', 'Low'];
                let allTodos = [];
                for (const p of priorities) {
                    const response = await hrService.getTodosByPriority(p);
                    const todos = response.data || [];
                    allTodos = allTodos.concat(todos);
                }
                const total = allTodos.length;
                const pending = allTodos.filter(todo => todo.status === 'Pending').length;
                const completed = allTodos.filter(todo => todo.status === 'Completed').length;

                const totalElement = document.getElementById('totalTaskCount');
                const pendingElement = document.getElementById('pendingTaskCount');
                const completedElement = document.getElementById('completedTaskCount');

                if (totalElement) totalElement.textContent = total;
                if (pendingElement) pendingElement.textContent = pending;
                if (completedElement) completedElement.textContent = completed;
            } catch (fallbackErr) {
                console.error('Fallback task count update also failed:', fallbackErr);
            }
        }
    }

    // Preload grouped data for better performance
    async function preloadGroupedData() {
        try {
            const cacheKey = 'todos_grouped';
            if (!memoCache.has(cacheKey)) {
                const response = await hrService.getTodosGroupedByPriority();
                const groupedTodos = response.data || { High: [], Medium: [], Low: [] };
                memoCache.set(cacheKey, groupedTodos);
                console.log('Grouped todos preloaded successfully');
            }
        } catch (err) {
            console.warn('Failed to preload grouped data:', err);
        }
    }

    // Initialize with preloading and then load the default view
    Promise.all([
        preloadGroupedData(),
        loadTodosByPriority('All')
    ]).then(() => {
        updateTaskCounts();
    }).catch(err => {
        console.error('Error during initialization:', err);
        // Fallback to loading without preload
        loadTodosByPriority('All').then(updateTaskCounts);
    });
});
