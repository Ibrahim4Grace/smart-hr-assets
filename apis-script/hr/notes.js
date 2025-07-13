import { hrService } from '../../../services/hr-service.js';
import { setButtonState, showStatus } from '../../../utils/utils.js';

document.addEventListener('DOMContentLoaded', function () {
    // Cache DOM elements
    const notesSlider = document.querySelector('.notes-slider');
    const notesGrid = document.querySelector('.notes-grid');
    const addNoteForm = document.querySelector('#add_note form');
    const editForm = document.querySelector('#edit-note-units form');
    const statusMessage = document.getElementById('status-message');
    const deleteModal = document.getElementById('delete_modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // State management
    let noteIdToDelete = null;
    let isProcessing = false;


    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const options = { year: 'numeric', month: 'short', day: '2-digit' };
        return d.toLocaleDateString('en-US', options);
    }

    // Optimistic Note Creation function to create a temporary note card
    function createTemporaryNoteCard(formData, tempId) {

        // Extract form data
        const title = formData.get('title') || 'Untitled Note';
        const content = formData.get('content') || '';
        const priority = formData.get('priority') || 'Low';
        const due_date = formData.get('due_date') || '';
        const tag = formData.get('tag') || '';
        const assigned_to = formData.get('assigned_to') || '';

        // Handle image preview
        const imageFile = formData.get('note_image');
        let imageUrl = 'https://cdn-icons-png.flaticon.com/512/2541/2541988.png';

        if (imageFile && imageFile.size > 0) {
            imageUrl = URL.createObjectURL(imageFile);
        }

        // Create note object
        const tempNote = {
            id: tempId,
            title,
            content,
            priority,
            due_date,
            tag,
            assigned_to,
            note_image: imageUrl,
            isTemporary: true // Flag to identify temporary notes
        };

        // Add to both slider and grid
        addNoteCardToDOM(tempNote);

        return tempNote;
    }

    function addNoteCardToDOM(note) {

        const priorityClass = note.priority === 'High' ? 'danger' :
            note.priority === 'Medium' ? 'warning' : 'info';
        const formattedDate = formatDate(note.due_date);
        const tempClass = note.isTemporary ? 'temporary-note' : '';

        // Slider card HTML (matches EJS slider design)
        const sliderCardHTML = `
          <div class="card rounded-3 mb-0 ${tempClass}" data-note-id="${note.id}">
            <div class="card-body p-4">
              <div class="d-flex align-items-center justify-content-between">
                <span class="badge bg-outline-${priorityClass} d-inline-flex align-items-center">
                  <i class="fas fa-circle fs-6 me-1"></i>${note.priority}
                </span>
                <div>
                  <a href="javascript:void(0);" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                  </a>
                  <div class="dropdown-menu notes-menu dropdown-menu-end">
                    <a href="#" class="dropdown-item view-note" data-note-id="${note.id}"><span><i data-feather="eye"></i></span>View</a>
                    <a href="#" class="dropdown-item edit-note" data-note-id="${note.id}"><span><i data-feather="edit"></i></span>Edit</a>
                    <a href="#" class="dropdown-item delete-note" data-note-id="${note.id}"><span><i data-feather="trash-2"></i></span>Delete</a>
                  </div>
                </div>
              </div>
              <div class="my-3">
                <h5 class="text-truncate mb-1"><a href="javascript:void(0);">${note.title}</a></h5>
                <p class="mb-3 d-flex align-items-center text-dark">
                  <i class="ti ti-calendar me-1"></i>
                  ${formattedDate}
                </p>
                <p class="text-truncate line-clamb-2 text-wrap">${note.content}</p>
              </div>
              <div class="d-flex align-items-center justify-content-between border-top pt-3">
                <div class="d-flex align-items-center">
                  <a href="javascript:void(0);" class="avatar avatar-md me-2">
                    <img src="${note.note_image}" alt="Profile" class="img-fluid rounded-circle">
                  </a>
                  <span class="text-info d-flex align-items-center">
                    <i class="fas fa-square square-rotate fs-10 me-1"></i>
                    ${note.tag}
                  </span>
                </div>
                <div class="d-flex align-items-center">
                  <a href="javascript:void(0);" class="me-2">
                    <span><i class="fas fa-star text-warning"></i></span>
                  </a>
                  <a href="javascript:void(0);" class="delete-note" data-note-id="${note.id}">
                    <span><i class="ti ti-trash text-danger"></i></span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        `;

        // Grid card HTML (matches EJS grid design)
        const gridCardHTML = `
        <div class="col-md-4 d-flex">
          <div class="card rounded-3 mb-4 flex-fill ${tempClass}" data-note-id="${note.id}">
            <div class="card-body p-4">
              <div class="d-flex align-items-center justify-content-between">
                <span class="badge bg-outline-${priorityClass} d-inline-flex align-items-center">
                  <i class="fas fa-circle fs-6 me-1"></i>${note.priority}
                </span>
                <div>
                  <a href="javascript:void(0);" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                  </a>
                  <div class="dropdown-menu notes-menu dropdown-menu-end">
                    <a href="#" class="dropdown-item view-note" data-note-id="${note.id}"><span><i data-feather="eye"></i></span>View</a>
                    <a href="#" class="dropdown-item edit-note" data-note-id="${note.id}"><span><i data-feather="edit"></i></span>Edit</a>
                    <a href="#" class="dropdown-item delete-note" data-note-id="${note.id}"><span><i data-feather="trash-2"></i></span>Delete</a>
                  </div>
                </div>
              </div>
              <div class="my-3">
                <h5 class="text-truncate mb-1"><a href="javascript:void(0);">${note.title}</a></h5>
                <p class="mb-3 d-flex align-items-center text-dark">
                  <i class="ti ti-calendar me-1"></i>
                  ${formattedDate}
                </p>
                <p class="text-truncate line-clamb-2 text-wrap">${note.content}</p>
              </div>
              <div class="d-flex align-items-center justify-content-between border-top pt-3">
                <div class="d-flex align-items-center">
                  <a href="javascript:void(0);" class="avatar avatar-md me-2">
                    <img src="${note.note_image}" alt="Profile" class="img-fluid rounded-circle">
                  </a>
                  <span class="text-info d-flex align-items-center">
                    <i class="fas fa-square square-rotate fs-10 me-1"></i>
                    ${note.tag}
                  </span>
                </div>
                <div class="d-flex align-items-center">
                  <a href="javascript:void(0);" class="me-2">
                    <span><i class="fas fa-star text-warning"></i></span>
                  </a>
                  <a href="javascript:void(0);" class="delete-note" data-note-id="${note.id}">
                    <span><i class="ti ti-trash text-danger"></i></span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        `;

        // Add to slider (Owl Carousel)
        if (notesSlider) {
            if (window.$ && $(notesSlider).hasClass('owl-carousel')) {
                const $slider = $(notesSlider);
                const cardElement = document.createElement('div');
                cardElement.innerHTML = sliderCardHTML;
                $slider.trigger('add.owl.carousel', [cardElement.firstElementChild, 0]);
                $slider.trigger('refresh.owl.carousel');
            } else {
                // Direct addition if not Owl Carousel
                const cardElement = document.createElement('div');
                cardElement.innerHTML = sliderCardHTML;
                notesSlider.insertBefore(cardElement.firstElementChild, notesSlider.firstChild);
            }
        }

        // Add to grid
        if (notesGrid) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = gridCardHTML;
            notesGrid.insertBefore(tempDiv.firstElementChild, notesGrid.firstChild);
        }
    }

    // Function to update temporary note with real data
    function updateTemporaryNote(tempId, realNote) {

        // Update the data-note-id attribute
        const sliderCard = notesSlider?.querySelector(`.card[data-note-id="${tempId}"]`);
        const gridCard = notesGrid?.querySelector(`.card[data-note-id="${tempId}"]`);

        [sliderCard, gridCard].forEach(card => {
            if (card) {
                card.setAttribute('data-note-id', realNote.id);
                card.classList.remove('temporary-note');

                // Update dropdown links
                const actionLinks = card.querySelectorAll('.view-note, .edit-note, .delete-note');
                actionLinks.forEach(link => {
                    link.setAttribute('data-note-id', realNote.id);
                });

                // Clean up temporary image URL if it was a blob
                const img = card.querySelector('img');
                if (img && img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                    img.src = realNote.note_image || 'https://cdn-icons-png.flaticon.com/512/2541/2541988.png';
                }
            }
        });
    }

    // Function to remove temporary note (if creation fails)
    function removeTemporaryNote(tempId) {
        const sliderCard = notesSlider?.querySelector(`.card[data-note-id="${tempId}"]`);
        const gridCard = notesGrid?.querySelector(`.card[data-note-id="${tempId}"]`);

        // Clean up any blob URLs
        [sliderCard, gridCard].forEach(card => {
            if (card) {
                const img = card.querySelector('img');
                if (img && img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                }
            }
        });

        // Remove from DOM
        removeNoteCardFromDOM(tempId);
    }

    // Optimized DOM update function to cache selectors and batch updates
    function updateNoteCardInDOM(noteId, note) {

        if (!note || typeof note !== 'object') {
            console.error('Invalid note data provided:', note);
            return;
        }

        // Batch DOM queries
        const sliderCard = notesSlider?.querySelector(`.card[data-note-id="${noteId}"]`);
        const gridCard = notesGrid?.querySelector(`.card[data-note-id="${noteId}"]`);

        [sliderCard, gridCard].forEach((card, index) => {
            if (!card) return;

            // Batch all updates to minimize reflows
            requestAnimationFrame(() => {
                const titleEl = card.querySelector('.note-title a, h5.text-truncate.mb-1 a');
                const dateEl = card.querySelector('.note-date, .d-flex.align-items-center.text-dark');
                const contentEl = card.querySelector('.note-content, .text-truncate.line-clamb-2.text-wrap');
                const badgeEl = card.querySelector('.badge');
                const tagEl = card.querySelector('.text-info.d-flex.align-items-center');
                const imgEl = card.querySelector('img');

                if (titleEl) {
                    const newTitle = note.title || '';
                    titleEl.textContent = newTitle;
                }

                if (dateEl) {
                    const formattedDate = formatDate(note.due_date);
                    const icon = dateEl.querySelector('i');
                    if (icon?.nextSibling) {
                        icon.nextSibling.textContent = ' ' + formattedDate;
                    } else {
                        dateEl.textContent = formattedDate;
                    }
                }

                if (contentEl) {
                    const newContent = note.content || '';
                    contentEl.textContent = newContent;
                }

                if (badgeEl) {
                    const newPriority = note.priority || '';
                    badgeEl.textContent = newPriority;
                    const priorityClass = newPriority === 'High' ? 'danger' :
                        newPriority === 'Medium' ? 'warning' : 'info';
                    badgeEl.className = `badge bg-outline-${priorityClass} d-inline-flex align-items-center`;
                }

                if (tagEl) {
                    const newTag = note.tag || '';
                    tagEl.textContent = newTag;
                }

                if (imgEl) {
                    const newImage = note.note_image || 'https://cdn-icons-png.flaticon.com/512/2541/2541988.png';
                    imgEl.src = newImage;
                }
            });
        });
    }

    // Optimized event delegation with early returns
    document.addEventListener('click', function (e) {
        // Use closest() once and check multiple conditions
        const target = e.target.closest('.view-note, .edit-note, .delete-note');
        if (!target) return;

        e.preventDefault();

        if (isProcessing) return; // Prevent multiple simultaneous operations

        const noteId = target.dataset.noteId;
        if (!noteId) return;

        if (target.classList.contains('view-note')) {
            handleViewNote(noteId);
        } else if (target.classList.contains('edit-note')) {
            handleEditNote(noteId);
        } else if (target.classList.contains('delete-note')) {
            handleDeleteNote(noteId);
        }
    });

    // Separate handlers for better performance
    async function handleViewNote(noteId) {
        try {
            isProcessing = true;
            const note = await hrService.findNoteById(noteId);

            // Batch DOM updates
            const modal = document.querySelector('#view-note-units');
            const elements = {
                title: modal.querySelector('.note-title'),
                tag: modal.querySelector('.note-tag'),
                content: modal.querySelector('.note-content'),
                description: modal.querySelector('.note-description'),
                image: modal.querySelector('.note-image'),
                priority: modal.querySelector('.note-priority')
            };

            requestAnimationFrame(() => {
                if (elements.title) elements.title.textContent = note.title || '';
                if (elements.tag) elements.tag.textContent = note.tag || '';
                if (elements.content) elements.content.textContent = note.content || '';
                if (elements.description) elements.description.textContent = note.description || '';

                if (elements.image) {
                    if (note.note_image) {
                        elements.image.src = note.note_image;
                        elements.image.style.display = 'block';
                    } else {
                        elements.image.style.display = 'none';
                    }
                }

                if (elements.priority) {
                    elements.priority.textContent = note.priority || '';
                    elements.priority.className = 'badge d-inline-flex align-items-center mb-0 note-priority';
                    const priorityClass = note.priority === 'High' ? 'bg-outline-danger' :
                        note.priority === 'Medium' ? 'bg-outline-warning' : 'bg-outline-success';
                    elements.priority.classList.add(priorityClass);
                }

                $('#view-note-units').modal('show');
            });
        } catch (error) {
            showStatus(statusMessage, 'Error loading note', true);
        } finally {
            isProcessing = false;
        }
    }

    async function handleEditNote(noteId) {
        try {
            isProcessing = true;
            const note = await hrService.findNoteById(noteId);

            const modal = document.querySelector('#edit-note-units');
            const form = modal.querySelector('form');

            // Batch form field updates
            requestAnimationFrame(() => {
                form.querySelector('[name="title"]').value = note.title || '';
                form.querySelector('[name="content"]').value = note.content || '';
                form.querySelector('[name="priority"]').value = note.priority || '';
                form.querySelector('[name="due_date"]').value = note.due_date || '';
                form.querySelector('[name="assigned_to"]').value = note.assigned_to || '';
                form.querySelector('[name="tag"]').value = note.tag || '';
                form.querySelector('[name="note_image"]').value = '';
                modal.dataset.noteId = noteId;

                $('#edit-note-units').modal('show');
            });
        } catch (error) {
            showStatus(statusMessage, 'Error loading note for editing', true);
        } finally {
            isProcessing = false;
        }
    }

    function handleDeleteNote(noteId) {
        noteIdToDelete = noteId;
        if (deleteModal) {
            const modal = new bootstrap.Modal(deleteModal);
            modal.show();
        }
    }

    // Optimized save edit with better error handling
    editForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (isProcessing) return;

        const modal = document.querySelector('#edit-note-units');
        const noteId = modal.dataset.noteId;
        const saveBtn = document.getElementById('edit-note-save-btn');
        if (!noteId) return;

        try {
            isProcessing = true;
            setButtonState(saveBtn, true, 'Saving...', 'Save Changes');

            // Use FormData to include all fields and the file (just like create)
            const fd = new FormData(this);
            const response = await hrService.updateNote(noteId, fd);

            // If your API returns the updated note, use it directly
            let noteData;
            if (response.note) {
                noteData = response.note;
            } else if (response.data) {
                noteData = response.data;
            } else if (response.data && response.data.note) {
                noteData = response.data.note;
            } else {
                // use the entire response if it contains note properties
                noteData = response;
            }

            // Validate that we have the required data
            if (!noteData || typeof noteData !== 'object') {
                throw new Error('Invalid response format from server');
            }

            updateNoteCardInDOM(noteId, noteData);

            $('#edit-note-units').modal('hide');
            showStatus(statusMessage, 'Note updated successfully!', false);

        } catch (error) {
            showStatus(statusMessage, 'Failed to update note', true);
        } finally {
            isProcessing = false;
            setButtonState(saveBtn, false, 'Saving...', 'Save Changes');
        }
    });

    // Optimized delete with better DOM manipulation
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function () {

            if (!noteIdToDelete || isProcessing) return;

            try {
                isProcessing = true;
                setButtonState(confirmDeleteBtn, true, 'Deleting...', 'Yes, Delete');

                await hrService.deleteNote(noteIdToDelete);

                // Optimized DOM removal
                removeNoteCardFromDOM(noteIdToDelete);
                showStatus(statusMessage, 'Note deleted successfully!', false);

            } catch (error) {
                console.error('Error deleting note:', error);
                showStatus(statusMessage, 'Failed to delete note', true);
            } finally {
                isProcessing = false;
                setButtonState(confirmDeleteBtn, false, 'Deleting...', 'Yes, Delete');
                bootstrap.Modal.getInstance(deleteModal)?.hide();
                noteIdToDelete = null;
            }
        });
    }

    // Optimized DOM removal
    function removeNoteCardFromDOM(noteId) {

        // Remove from slider (Owl Carousel)
        if (notesSlider) {
            if (window.$ && $(notesSlider).hasClass('owl-carousel')) {
                const $slider = $(notesSlider);
                const $items = $slider.find(`.card[data-note-id="${noteId}"]`);

                if ($items.length) {
                    // Use Owl Carousel's proper removal method
                    $items.each(function () {
                        const $item = $(this);
                        const $owlItem = $item.closest('.owl-item');

                        if ($owlItem.length) {
                            // Get the index of the owl-item for proper removal
                            const itemIndex = $owlItem.index();
                            // Use Owl Carousel's remove method
                            try {
                                $slider.trigger('remove.owl.carousel', [itemIndex]);
                            } catch (error) {
                                console.error('Error using Owl remove method, falling back to direct removal:', error);
                                $owlItem.remove();
                            }
                        } else {
                            $item.remove();
                        }
                    });

                    // Refresh the carousel after all removals
                    try {
                        $slider.trigger('refresh.owl.carousel');
                    } catch (error) {
                        console.error('Error refreshing Owl Carousel:', error);
                    }

                    // Final cleanup check - remove any remaining items
                    setTimeout(() => {
                        const remainingItems = $slider.find(`.card[data-note-id="${noteId}"]`);
                        if (remainingItems.length) {
                            remainingItems.each(function () {
                                const $remaining = $(this);
                                const $owlItem = $remaining.closest('.owl-item');
                                if ($owlItem.length) {
                                    $owlItem.remove();
                                } else {
                                    $remaining.remove();
                                }
                            });
                            $slider.trigger('refresh.owl.carousel');
                        } else {
                            console.log('All items successfully removed from slider');
                        }
                    }, 100);

                } else {
                    console.log('No slider items found to remove');
                }
            } else {
                // Direct removal if not Owl Carousel
                const cards = notesSlider.querySelectorAll(`.card[data-note-id="${noteId}"]`);
                cards.forEach(card => {
                    const parentItem = card.closest('.owl-item') || card.parentElement;
                    parentItem?.remove();
                });
            }
        } else {
            console.log('No notesSlider found');
        }

        // Remove from grid
        if (notesGrid) {
            const cards = notesGrid.querySelectorAll(`.card[data-note-id="${noteId}"]`);

            cards.forEach((card, index) => {
                // Find the closest column wrapper and remove it
                const colDiv = card.closest('.col-md-4, .col-lg-4, .col-xl-4, .col-sm-6, .col-md-6, .col-lg-6, .col-xl-6') || card.parentElement;
                if (colDiv) {
                    colDiv.remove();
                } else {
                    card.remove();
                }
            });
        } else {
            console.log('No notesGrid found');
        }
    }


    // Event delegation for image preview (works for both add and edit modals)
    document.body.addEventListener('change', function (e) {
        // Edit modal
        if (e.target.matches('#edit-note-units input[name="note_image"]')) {
            const editPreviewContainer = document.getElementById('edit-image-preview');
            if (!editPreviewContainer) return;
            editPreviewContainer.innerHTML = '';
            if (e.target.files?.[0]) {
                const file = e.target.files[0];
                const maxSize = 2 * 1024 * 1024; // 2MB
                if (file.size > maxSize) {
                    showStatus(statusMessage, 'File too large. Maximum size is 2MB.', true);
                    e.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (ev) {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.className = 'img-thumbnail';
                    img.style.maxWidth = '150px';
                    img.style.maxHeight = '150px';
                    editPreviewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }
        // Add modal
        if (e.target.matches('#add_note input[name="note_image"]')) {
            const addPreviewContainer = document.getElementById('add-image-preview');
            if (!addPreviewContainer) return;
            addPreviewContainer.innerHTML = '';
            if (e.target.files?.[0]) {
                const file = e.target.files[0];
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    showStatus(statusMessage, 'File too large. Maximum size is 5MB.', true);
                    e.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (ev) {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.className = 'img-thumbnail';
                    img.style.maxWidth = '150px';
                    img.style.maxHeight = '150px';
                    addPreviewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // Updated form submission with optimistic updates
    if (addNoteForm) {
        const addNoteButton = addNoteForm.querySelector('#add-note-save-btn');

        addNoteForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (isProcessing) return;

            // Validate form
            const validation = validateForm(this);
            if (!validation.isValid) {
                showStatus(statusMessage, validation.message, true);
                return;
            }

            // Generate temporary ID
            const tempId = 'temp_' + Date.now();
            let tempNote = null;

            try {
                isProcessing = true;
                setButtonState(addNoteButton, true, 'Creating...', 'Create Note');

                const fd = new FormData(this);

                // OPTIMISTIC UPDATE: Add note to DOM immediately
                tempNote = createTemporaryNoteCard(fd, tempId);

                // Close modal and reset form immediately
                $('#add_note').modal('hide');
                this.reset();

                // Clear preview container
                const previewContainer = document.getElementById('add-image-preview');
                if (previewContainer) {
                    previewContainer.innerHTML = '';
                }

                // Show optimistic success message
                showStatus(statusMessage, 'Note created successfully!', false);

                // Make API call in background
                const response = await hrService.createNote(fd);

                // Get real note data from response
                let realNote;
                if (response.note) {
                    realNote = response.note;
                } else if (response.data) {
                    realNote = response.data;
                } else {
                    realNote = response;
                }

                // Check if we have actual note data
                if (realNote && realNote.id) {
                    // Update temporary note with real data
                    updateTemporaryNote(tempId, realNote);
                } else {
                    // If no real note data, just update the tempId to a more permanent one
                    // You might want to fetch the latest notes or generate a better ID
                    const permanentId = 'note_' + Date.now();
                    updateTemporaryNote(tempId, { ...tempNote, id: permanentId, isTemporary: false });
                }

            } catch (error) {
                console.error('Error creating note:', error);

                // Remove temporary note on error
                if (tempNote) {
                    removeTemporaryNote(tempId);
                }

                // Show error message
                showStatus(statusMessage, 'Failed to create note: ' + error.message, true);

                // Reopen modal to let user retry
                $('#add_note').modal('show');

            } finally {
                isProcessing = false;
                setButtonState(addNoteButton, false, 'Creating...', 'Create Note');
            }
        });
    }

    // Validation helper
    function validateForm(form) {
        const title = form.title.value;
        const tag = form.tag.value;
        const priority = form.priority.value;
        const assigned_to = form.assigned_to.value;

        if (!title?.trim()) {
            return { isValid: false, message: 'Note Title is required' };
        }
        if (!tag || tag === 'Select') {
            return { isValid: false, message: 'Tag is required' };
        }
        if (!priority || priority === 'Select') {
            return { isValid: false, message: 'Priority is required' };
        }
        if (!assigned_to || assigned_to === 'Select') {
            return { isValid: false, message: 'Assignee is required' };
        }

        return { isValid: true };
    }
});