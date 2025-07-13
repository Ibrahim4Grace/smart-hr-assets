import { handleManualFormSubmission, validationRules, sanitizeFormData } from '../../../utils/utils.js';
import { hrService } from '../../../services/hr-service.js';

// Global variables
let calendar;
let selectedEventId = null;

// Performance optimizations
const eventCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingRequests = new Set();
let viewChangeTimeout;

// Extract repeated logic
function normalizeEvents(data) {
    let events = data || [];
    if (!Array.isArray(events)) {
        events = Object.values(events).filter(v =>
            typeof v === 'object' && v !== null && !Array.isArray(v)
        );
    }
    return events;
}

// Cached API calls
async function getCachedEvents(startTime, endTime) {
    const cacheKey = `${startTime}-${endTime}`;
    const cached = eventCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        const response = await hrService.getCalendarEvents(startTime, endTime);
        eventCache.set(cacheKey, {
            data: response,
            timestamp: Date.now()
        });
        return response;
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
}

async function getCachedUpcomingEvents(limit = 5) {
    const cacheKey = `upcoming-${limit}`;
    const cached = eventCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        const response = await hrService.getUpcomingEvents(limit);
        eventCache.set(cacheKey, {
            data: response,
            timestamp: Date.now()
        });
        return response;
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        throw error;
    }
}

// Clear cache when events are modified
function clearEventCache() {
    eventCache.clear();
}

// Main initialization
document.addEventListener('DOMContentLoaded', async function () {
    const calendarEl = document.getElementById('calendar');

    if (!calendarEl) {
        console.error('Calendar element not found');
        return;
    }

    // Initialize external events draggable
    initializeExternalEvents();

    // Initialize calendar
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },

        // Optimized event source
        events: async function (fetchInfo, successCallback, failureCallback) {
            try {
                const startTime = fetchInfo.start.toISOString().slice(0, 10);
                const endTime = fetchInfo.end.toISOString().slice(0, 10);

                const response = await getCachedEvents(startTime, endTime);
                const events = normalizeEvents(response.data);

                // Map backend events to FullCalendar's format
                const calendarEvents = events.map(ev => ({
                    id: ev.id,
                    title: ev.title,
                    start: ev.event_date || ev.start_time,
                    end: ev.end_time,
                    location: ev.location,
                    description: ev.description,
                    backgroundColor: getEventColor(ev),
                    borderColor: getEventColor(ev),
                    textColor: '#ffffff', // Ensure text is always visible
                    classNames: ['custom-event'] // Add custom class for styling
                }));

                successCallback(calendarEvents);
            } catch (err) {
                console.error('Error loading calendar events:', err);
                failureCallback(err);
            }
        },

        // Event handlers
        dateClick: function (info) {
            selectedEventId = null;
            openEventModal({
                date: info.dateStr
            });
        },

        eventClick: function (info) {
            selectedEventId = info.event.id;
            openEventModal({
                id: info.event.id,
                title: info.event.title,
                start: info.event.startStr,
                end: info.event.endStr,
                location: info.event.extendedProps.location,
                description: info.event.extendedProps.description
            });
        },

        // Drag and drop
        droppable: true,
        drop: function (info) {
            handleEventDrop(info);
        },

        // Debounced view changes
        datesSet: function (info) {
            clearTimeout(viewChangeTimeout);
            viewChangeTimeout = setTimeout(async () => {
                // Run in parallel for better performance
                await Promise.all([
                    renderSidebarEvents(info.startStr, info.endStr),
                    renderUpcomingEvents(),
                    renderEventsTable() // Add table rendering to view changes
                ]);
            }, 300);
        },

        // Better event display
        eventDidMount: function (info) {
            const eventEl = info.el;
            eventEl.style.fontSize = '12px';
            eventEl.style.padding = '2px 4px';
            eventEl.style.borderRadius = '3px';
            eventEl.style.cursor = 'pointer';
            // Add tooltip
            eventEl.title = `${info.event.title}${info.event.extendedProps.location ? ' - ' + info.event.extendedProps.location : ''}`;
        }
    });

    // Render calendar
    calendar.render();

    // Initial data load
    await initializeCalendarData();

    // Setup event listeners
    setupEventListeners();
});

// Initialize external events
function initializeExternalEvents() {
    const externalEventsEl = document.getElementById('external-events');
    if (externalEventsEl && window.FullCalendar && FullCalendar.Draggable) {
        new FullCalendar.Draggable(externalEventsEl, {
            itemSelector: '.fc-event',
            eventData: function (eventEl) {
                try {
                    return JSON.parse(eventEl.getAttribute('data-event'));
                } catch (e) {
                    console.error('Error parsing event data:', e);
                    return {};
                }
            }
        });
    }
}

// Handle drag and drop
function handleEventDrop(info) {
    try {
        const eventData = JSON.parse(info.draggedEl.getAttribute('data-event'));

        // Remove event_id if it exists
        delete eventData.event_id;

        // Set the event's date to the drop date
        const dropDate = info.date.toISOString();
        eventData.event_date = dropDate;
        eventData.start_time = dropDate;
        eventData.end_time = dropDate;

        // Add the event to the calendar UI
        calendar.addEvent({
            title: eventData.title,
            start: eventData.event_date,
            end: eventData.end_time,
            backgroundColor: getEventColor(eventData),
            borderColor: getEventColor(eventData),
            textColor: '#ffffff',
            classNames: ['custom-event']
        });

        // Optional: Remove the external event element
        info.draggedEl.style.opacity = '0.5';

    } catch (error) {
        console.error('Error handling event drop:', error);
    }
}

// Initial data load
async function initializeCalendarData() {
    if (!calendar) return;

    try {
        const view = calendar.view;
        const startTime = view.activeStart.toISOString().slice(0, 10);
        const endTime = view.activeEnd.toISOString().slice(0, 10);

        await Promise.all([
            renderSidebarEvents(startTime, endTime),
            renderUpcomingEvents(),
            renderEventsTable() // Add table rendering to initial load
        ]);
    } catch (error) {
        console.error('Error initializing calendar data:', error);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Create button clicks
    document.addEventListener('click', function (e) {
        if (e.target.matches('[data-bs-target="#add_event"]') || e.target.closest('[data-bs-target="#add_event"]')) {
            selectedEventId = null;
            setTimeout(() => {
                setDefaultEventValues();
            }, 100);
        }
    });

    // Modal reset
    const modalEl = document.getElementById('add_event');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', resetModal);
    }

    // Form submission
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        setupFormSubmission();
    }

    // Delete button
    const deleteBtn = document.querySelector('#add_event .btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleEventDelete);
    }

    // Setup table event handlers
    setupTableEventHandlers();
}

// NEW: Setup table event handlers
function setupTableEventHandlers() {
    const tableBody = document.getElementById('eventsTableBody');
    if (!tableBody) return;

    // Delegate edit/delete actions for table
    tableBody.addEventListener('click', async function (e) {
        const row = e.target.closest('tr[data-event-id]');
        if (!row) return;

        const eventId = row.getAttribute('data-event-id');

        // Edit button clicked
        if (e.target.closest('.btn-edit-event')) {
            try {
                // Fetch event details from cache or API
                const response = await getCachedUpcomingEvents(100);
                let events = response.data || response;
                if (!Array.isArray(events)) {
                    events = normalizeEvents(events);
                }

                const event = events.find(ev => String(ev.id) === String(eventId));
                if (event) {
                    selectedEventId = event.id;
                    openEventModal({
                        id: event.id,
                        title: event.title,
                        start: event.start_time,
                        end: event.end_time,
                        location: event.location,
                        description: event.description
                    });
                }
            } catch (error) {
                console.error('Error fetching event for edit:', error);
                if (typeof toastr !== 'undefined') {
                    toastr.error('Failed to load event details');
                }
            }
        }

        // Delete button clicked
        if (e.target.closest('.btn-delete-event')) {
            if (confirm('Are you sure you want to delete this event?')) {
                const deleteBtn = e.target.closest('.btn-delete-event');
                const originalText = deleteBtn.innerHTML;

                try {
                    deleteBtn.innerHTML = '<i class="ti ti-loader"></i>';
                    deleteBtn.disabled = true;

                    await hrService.deleteCalendarEvent(eventId);

                    // Clear cache and refresh all components
                    clearEventCache();
                    await Promise.all([
                        renderEventsTable(),
                        refreshCalendar()
                    ]);

                    if (typeof toastr !== 'undefined') {
                        toastr.success('Event deleted successfully!');
                    }
                } catch (error) {
                    console.error('Error deleting event:', error);
                    if (typeof toastr !== 'undefined') {
                        toastr.error('Failed to delete event');
                    }
                } finally {
                    deleteBtn.innerHTML = originalText;
                    deleteBtn.disabled = false;
                }
            }
        }
    });
}

// Reset modal
function resetModal() {
    const form = document.getElementById('eventForm');
    const modalTitle = document.querySelector('#add_event .modal-title');
    const submitBtn = document.getElementById('submitBtn');
    const deleteBtn = document.querySelector('#add_event .btn-delete');

    if (form) form.reset();
    selectedEventId = null;

    if (modalTitle) modalTitle.textContent = 'Add New Event';
    if (submitBtn) submitBtn.textContent = 'Add Event';
    if (deleteBtn) deleteBtn.style.display = 'none';
}

// Set default values for new events
function setDefaultEventValues() {
    const now = new Date();
    const currentDate = formatDateForInput(now);
    const currentTime = convertTo12HourFormat(formatTimeForInput(now));
    const nextHourTime = convertTo12HourFormat(formatTimeForInput(new Date(now.getTime() + 60 * 60 * 1000)));

    const dateInput = document.getElementById('eventDate');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');

    if (dateInput) dateInput.value = currentDate;
    if (startTimeInput) startTimeInput.value = currentTime;
    if (endTimeInput) endTimeInput.value = nextHourTime;
}

// Date/time formatting helpers
function formatDateForInput(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatTimeForInput(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function convertTo12HourFormat(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${period}`;
}

function convertTo24HourFormat(time12) {
    const [time, period] = time12.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Open event modal
function openEventModal(event = {}) {
    // Set form values
    const titleInput = document.getElementById('eventTitle');
    const dateInput = document.getElementById('eventDate');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const locationInput = document.getElementById('eventLocation');
    const descriptionInput = document.getElementById('eventDescription');

    if (titleInput) titleInput.value = event.title || '';
    if (locationInput) locationInput.value = event.location || '';
    if (descriptionInput) descriptionInput.value = event.description || '';

    // Handle date formatting
    let displayDate = '';
    if (event.start) {
        displayDate = event.start.split('T')[0];
    } else if (event.date) {
        displayDate = event.date;
    }

    if (displayDate && displayDate.includes('-')) {
        const dateParts = displayDate.split('-');
        if (dateParts.length === 3 && dateParts[0].length === 4) {
            // Convert from YYYY-MM-DD to DD-MM-YYYY
            displayDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        }
    }

    if (dateInput) dateInput.value = displayDate;

    // Handle time formatting
    let displayStartTime = '';
    let displayEndTime = '';

    if (event.start && event.start.includes('T')) {
        const timeStr = event.start.split('T')[1]?.substring(0, 5);
        if (timeStr) displayStartTime = convertTo12HourFormat(timeStr);
    }

    if (event.end && event.end.includes('T')) {
        const timeStr = event.end.split('T')[1]?.substring(0, 5);
        if (timeStr) displayEndTime = convertTo12HourFormat(timeStr);
    }

    if (startTimeInput) startTimeInput.value = displayStartTime;
    if (endTimeInput) endTimeInput.value = displayEndTime;

    // Update modal UI
    updateModalUI();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('add_event'));
    modal.show();
}

// Update modal UI based on selected event
function updateModalUI() {
    const modalTitle = document.querySelector('#add_event .modal-title');
    const submitBtn = document.getElementById('submitBtn');
    const deleteBtn = document.querySelector('#add_event .btn-delete');

    if (selectedEventId) {
        if (modalTitle) modalTitle.textContent = 'Edit Event';
        if (submitBtn) submitBtn.textContent = 'Update Event';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
    } else {
        if (modalTitle) modalTitle.textContent = 'Add New Event';
        if (submitBtn) submitBtn.textContent = 'Add Event';
        if (deleteBtn) deleteBtn.style.display = 'none';
        setDefaultEventValues();
    }
}

// Setup form submission with deduplication
function setupFormSubmission() {
    const eventForm = document.getElementById('eventForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMessage = document.getElementById('calendarStatusMessage');

    if (!eventForm || !submitBtn) return;

    handleManualFormSubmission({
        form: eventForm,
        button: submitBtn,
        statusMessage,
        onValidate: validateEventForm,
        onSubmit: submitEventForm,
        loadingText: 'Saving...',
        defaultText: selectedEventId ? 'Update Event' : 'Add Event',
        successMessage: selectedEventId ? 'Event updated successfully!' : 'Event created successfully!',
        autoSanitize: true,
        resetForm: false
    });
}

// Form validation
function validateEventForm(data) {
    // Required fields
    validationRules.required(data.title, 'Event Name');
    validationRules.required(data.date, 'Event Date');
    validationRules.required(data.startTime, 'Start Time');
    validationRules.required(data.endTime, 'End Time');

    // Time format validation
    const timeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
        throw new Error('Please enter time in 12-hour format (hh:mm AM/PM)');
    }

    // End time after start time validation
    const startMinutes = timeToMinutes(data.startTime);
    const endMinutes = timeToMinutes(data.endTime);

    if (startMinutes >= endMinutes) {
        throw new Error('End time must be after start time');
    }

    return sanitizeFormData(data);
}

// Convert time to minutes for comparison
function timeToMinutes(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

// Submit event form
async function submitEventForm(formData) {
    // Prevent duplicate submissions
    const requestId = `${selectedEventId || 'new'}-${JSON.stringify(formData)}`;

    if (pendingRequests.has(requestId)) {
        throw new Error('Request already in progress');
    }

    pendingRequests.add(requestId);

    try {
        // Convert date and time to backend format
        const [day, month, year] = formData.date.split('-');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        const startTime24 = convertTo24HourFormat(formData.startTime);
        const endTime24 = convertTo24HourFormat(formData.endTime);

        const start = `${formattedDate}T${startTime24}:00Z`;
        const end = `${formattedDate}T${endTime24}:00Z`;

        const eventData = {
            title: formData.title,
            event_date: start,
            start_time: start,
            end_time: end,
            location: formData.location || '',
            description: formData.description || ''
        };

        let response;
        if (selectedEventId) {
            response = await hrService.updateCalendarEvent(selectedEventId, eventData);
        } else {
            response = await hrService.createCalendarEvent(eventData);
        }

        // Clear cache and refresh calendar
        clearEventCache();

        // Hide modal
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('add_event'));
        if (modalInstance) modalInstance.hide();

        // Refresh calendar and table efficiently
        await Promise.all([
            refreshCalendar(),
            renderEventsTable() // Add table refresh
        ]);

        return response;

    } finally {
        pendingRequests.delete(requestId);
    }
}

// Optimized calendar refresh
async function refreshCalendar() {
    try {
        // Use FullCalendar's built-in refresh instead of manual event manipulation
        if (calendar) {
            calendar.refetchEvents();
        }

        // Update sidebar
        await renderUpcomingEvents();

    } catch (error) {
        console.error('Error refreshing calendar:', error);
        if (typeof toastr !== 'undefined') {
            toastr.error('Failed to refresh calendar events');
        }
    }
}

// Handle event deletion
async function handleEventDelete() {
    if (!selectedEventId) {
        alert('No event selected for deletion');
        return;
    }

    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    const deleteBtn = this;
    const originalText = deleteBtn.textContent;

    try {
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;

        await hrService.deleteCalendarEvent(selectedEventId);

        // Clear cache and refresh
        clearEventCache();

        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('add_event'));
        if (modalInstance) modalInstance.hide();

        await Promise.all([
            refreshCalendar(),
            renderEventsTable() // Add table refresh
        ]);

        if (typeof toastr !== 'undefined') {
            toastr.success('Event deleted successfully!');
        } else {
            alert('Event deleted successfully!');
        }

        selectedEventId = null;

    } catch (err) {
        console.error('Error deleting event:', err);
        const errorMessage = err.message || 'Unknown error occurred';

        if (typeof toastr !== 'undefined') {
            toastr.error('Error deleting event: ' + errorMessage);
        } else {
            alert('Error deleting event: ' + errorMessage);
        }
    } finally {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    }
}

// NEW: Render events table function
async function renderEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return; // Exit if table doesn't exist

    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const response = await getCachedUpcomingEvents(100); // Fetch more events for table
        let events = response.data || response;

        if (!Array.isArray(events)) {
            events = normalizeEvents(events);
        }

        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No events found</td></tr>';
            return;
        }

        tbody.innerHTML = events.map(ev => {
            // Format date and time for display
            const date = ev.event_date ? new Date(ev.event_date) : new Date(ev.start_time);
            const start = ev.start_time ? new Date(ev.start_time) : date;
            const end = ev.end_time ? new Date(ev.end_time) : date;

            const dateStr = date.toLocaleDateString();
            const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <tr data-event-id="${ev.id}">
                    <td>${ev.title || ''}</td>
                    <td>${dateStr}</td>
                    <td>${startStr}</td>
                    <td>${endStr}</td>
                    <td>${ev.location || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-edit-event me-1" data-id="${ev.id}">
                            <i class="ti ti-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete-event" data-id="${ev.id}">
                            <i class="ti ti-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error rendering events table:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load events</td></tr>';
    }
}

// Sidebar and upcoming events rendering
function formatTime(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Invalid time';
    }
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

function getEventColor(event) {
    // You can customize this based on event properties
    const colors = [
        '#6f42c1', // Purple
        '#28a745', // Green
        '#ffc107', // Yellow
        '#dc3545', // Red
        '#17a2b8', // Blue
        '#fd7e14'  // Orange
    ];

    // Use event ID or title to consistently assign colors
    const index = (event.id || event.title || '').length % colors.length;
    return colors[index];
}

async function renderUpcomingEvents() {
    const container = document.getElementById('upcoming-events-list');
    const countBadge = document.getElementById('upcoming-count');

    if (!container || !countBadge) return;

    container.innerHTML = '<div class="text-muted">Loading...</div>';

    try {
        const response = await getCachedUpcomingEvents(5);
        const events = normalizeEvents(response.data);

        countBadge.textContent = events.length;

        if (events.length === 0) {
            container.innerHTML = '<div class="text-muted">No upcoming events</div>';
            return;
        }

        container.innerHTML = events.map(ev => `
            <div class="border-start border-3 mb-3" style="border-color: ${getEventColor(ev)} !important;">
                <div class="ps-3">
                    <h6 class="fw-medium mb-1">${ev.title}</h6>
                    <p class="fs-12">
                        <i class="ti ti-calendar-check text-info me-2"></i>
                        ${formatDate(ev.event_date)}
                        <span class="ms-2">
                            <i class="ti ti-clock text-info me-1"></i>
                            ${formatTime(ev.start_time)}
                        </span>
                    </p>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error rendering upcoming events:', err);
        container.innerHTML = '<div class="text-danger">Failed to load events</div>';
    }
}

const sidebarColorClasses = [
    "bg-transparent-success text-success",
    "bg-transparent-warning text-warning",
    "bg-transparent-danger text-danger",
    "bg-transparent-skyblue text-skyblue",
    "bg-transparent-purple text-purple",
    "bg-transparent-info text-info"
];

async function renderSidebarEvents(startTime, endTime) {
    const container = document.getElementById('external-events');
    if (!container) return;

    container.innerHTML = '<div class="text-muted">Loading...</div>';

    try {
        const response = await getCachedEvents(startTime, endTime);
        const events = normalizeEvents(response.data);

        if (events.length === 0) {
            container.innerHTML = '<div class="text-muted bg-light p-3 rounded-3"><strong>No events for this month</strong></div>';
            return;
        }

        container.innerHTML = events.map((ev, idx) => {
            const colorClass = sidebarColorClasses[idx % sidebarColorClasses.length];
            return `
                <div class="fc-event ${colorClass} mb-1" data-event='${JSON.stringify({ title: ev.title, event_id: ev.id })}'>
                    <i class="ti ti-square-rounded me-2"></i>${ev.title}
                </div>
            `;
        }).join('');

        // Re-initialize draggable
        initializeExternalEvents();

    } catch (err) {
        console.error('Error rendering sidebar events:', err);
        container.innerHTML = '<div class="text-danger">Failed to load events</div>';
    }
}