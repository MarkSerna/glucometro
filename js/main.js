import { registerServiceWorker, notificationScheduler } from './pwa.js';
import { getTargetRanges, saveTargetRanges, saveRecord } from './storage.js';
import { showAlert, getFormData, validateData, displayResults, clearForm, initializeDateSelector, displayHistory, initializeHistoryFilters, exportHistory, clearHistory, deleteHistoryRecord, updateNotificationStatus, initializeMealSections } from './ui.js';
import { analyzeGlucoseData } from './analysis.js';

document.addEventListener('DOMContentLoaded', async function() {
    registerServiceWorker();
    initializeMealSections();
    await initializeDateSelector();
    initializeHistoryFilters();

    const form = document.getElementById('glucoseForm');
    form.addEventListener('submit', handleFormSubmit);

    const clearBtn = document.getElementById('clearBtn');
    clearBtn.addEventListener('click', clearForm);

    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    exportHistoryBtn.addEventListener('click', exportHistory);

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    clearHistoryBtn.addEventListener('click', clearHistory);

    const historyListContainer = document.getElementById('historyList');
    if (historyListContainer) {
        historyListContainer.addEventListener('click', function(e) {
            const deleteBtn = e.target.closest('.delete-record-btn');
            if (deleteBtn) {
                const id = parseInt(deleteBtn.getAttribute('data-id'));
                deleteHistoryRecord(id);
            }
        });
    }

    const saveTargetsBtn = document.getElementById('saveTargetsBtn');
    saveTargetsBtn.addEventListener('click', handleSaveTargetRanges);

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.id.replace('Tab', 'Content');
            const tabContents = document.querySelectorAll('.tab-content');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            if (tabId === 'historyContent') {
                displayHistory();
            }
            if (tabId === 'statsContent') {
                const history = await getHistory();
                displayHistorySummary(history);
                displayTrends();
            }
            if (tabId === 'settingsContent') {
                updateNotificationStatus();
            }
        });
    });

    const savedEnabled = localStorage.getItem('notificationsEnabled');
    if (savedEnabled === 'true' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            notificationScheduler.notificationsEnabled = true;
            notificationScheduler.start();
        } else if (Notification.permission === 'denied') {
            localStorage.setItem('notificationsEnabled', 'false');
            notificationScheduler.notificationsEnabled = false;
        }
    }
    updateNotificationStatus();

    loadTargetRanges();
});

async function handleFormSubmit(event) {
    event.preventDefault();
    const formData = getFormData();
    if (!validateData(formData)) {
        return;
    }
    const analysis = analyzeGlucoseData(formData);
    const selectedDateTime = getSelectedDateTime();
    const record = {
        id: selectedDateTime.dateObject.getTime(),
        date: selectedDateTime.date,
        time: selectedDateTime.time,
        timestamp: selectedDateTime.timestamp,
        measurements: formData,
        statistics: analysis.statistics,
        alertsCount: analysis.alerts.length,
        hasHighReadings: analysis.statistics.badReadings > 0,
        type: 'complete'
    };
    await saveRecord(record);
    displayResults(analysis);
    showAlert('Registro guardado para la fecha y hora seleccionada.', 'success');
}

async function handleSaveTargetRanges() {
    const beforeMeal = parseInt(document.getElementById('beforeMealTarget').value);
    const afterMeal = parseInt(document.getElementById('afterMealTarget').value);

    if (beforeMeal < 50 || beforeMeal > 200) {
        showAlert('El rango antes de comidas debe estar entre 50 y 200 mg/dL', 'warning');
        return;
    }
    if (afterMeal < 100 || afterMeal > 300) {
        showAlert('El rango después de comidas debe estar entre 100 y 300 mg/dL', 'warning');
        return;
    }

    const ranges = { beforeMeal, afterMeal };
    await saveTargetRanges(ranges);

    const btn = document.getElementById('saveTargetsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Guardado';
    btn.classList.add('bg-green-500');
    btn.classList.remove('bg-blue-500');
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('bg-green-500');
        btn.classList.add('bg-blue-500');
    }, 2000);
}

async function loadTargetRanges() {
    const ranges = await getTargetRanges();
    document.getElementById('beforeMealTarget').value = ranges.beforeMeal;
    document.getElementById('afterMealTarget').value = ranges.afterMeal;
}

window.enableNotifications = async () => {
    const enabled = await notificationScheduler.requestPermission();
    if (enabled) {
        notificationScheduler.start();
        showAlert('Notificaciones habilitadas correctamente. Recibirás recordatorios para medir tu glucosa.', 'success');
    } else {
        if (Notification.permission === 'denied') {
            showAlert('Permisos de notificación denegados. Para habilitarlos:\n\n1. Ve a la configuración del navegador\n2. Busca "Notificaciones" o "Permisos"\n3. Permite notificaciones para este sitio', 'warning');
        } else {
            showAlert('No se pudieron habilitar las notificaciones. Verifica que tu navegador las soporte.', 'warning');
        }
    }
    updateNotificationStatus();
};

window.disableNotifications = () => {
    notificationScheduler.stop();
    localStorage.setItem('notificationsEnabled', 'false');
    showAlert('Notificaciones deshabilitadas.', 'success');
    updateNotificationStatus();
};

window.testNotification = async () => {
    if (!('Notification' in window)) {
        showAlert('Tu navegador no soporta notificaciones.', 'warning');
        return;
    }
    if (Notification.permission !== 'granted') {
        showAlert('Primero debes habilitar las notificaciones.', 'warning');
        return;
    }
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('Prueba de Notificación', {
                body: '¡Las notificaciones están funcionando correctamente! 🎉',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIHJ4PSIyNCIgZmlsbD0iIzNCODJGNiIvPjx0ZXh0IHg9Ijk2IiB5PSIxMTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfqbI8L3RleHQ+PC9zdmc+',
                badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzNiIgY3k9IjM2IiByPSIzNiIgZmlsbD0iIzNCODJGNiIvPjx0ZXh0IHg9IjM2IiB5PSI0NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+psjwvdGV4dD48L3N2Zz4=',
                tag: 'test-notification',
                requireInteraction: false,
                vibrate: [200, 100, 200],
                actions: [
                    {
                        action: 'open',
                        title: 'Abrir App'
                    }
                ]
            });
            showAlert('Notificación de prueba enviada vía Service Worker. Verifica si la recibiste.', 'success');
        } else {
            const notification = new Notification('Prueba de Notificación', {
                body: '¡Las notificaciones están funcionando correctamente! 🎉',
                icon: '🩺',
                badge: '🩺',
                tag: 'test-notification',
                requireInteraction: false
            });
            notification.onclick = function() {
                window.focus();
                notification.close();
            };
            setTimeout(() => {
                notification.close();
            }, 5000);
            showAlert('Notificación de prueba enviada. Verifica si la recibiste.', 'success');
        }
    } catch (error) {
        console.error('Error al enviar notificación de prueba:', error);
        showAlert('Error al enviar notificación de prueba: ' + error.message, 'warning');
    }
};

window.testMobileAlert = () => {
    const alertTypes = [
        { type: 'info', message: '🩺 Alerta de información - Prueba en móvil' },
        { type: 'warning', message: '⚠️ Alerta de advertencia - Prueba en móvil' },
        { type: 'error', message: '🚨 Alerta de error - Prueba en móvil' }
    ];
    alertTypes.forEach((alert, index) => {
        setTimeout(() => {
            notificationScheduler.showInAppAlert(alert.message, alert.type);
        }, index * 2000);
    });
    showAlert('Probando alertas en móvil. Verifica que aparezcan correctamente.', 'success');
};
