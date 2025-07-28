// js/pwa.js

import { showAlert } from './ui.js';

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker registrado exitosamente:', registration.scope);
                    let deferredPrompt;
                    window.addEventListener('beforeinstallprompt', (e) => {
                        console.log('PWA: Evento beforeinstallprompt disparado');
                        e.preventDefault();
                        deferredPrompt = e;
                        showInstallBanner(deferredPrompt);
                    });
                    window.addEventListener('appinstalled', (evt) => {
                        console.log('PWA: App instalada exitosamente');
                        showAlert('¡Glucómetro Digital instalado correctamente en tu dispositivo!', 'success');
                        hideInstallBanner();
                    });
                })
                .catch(error => {
                    console.log('Service Worker: Error en el registro:', error);
                });
        });
    }
}

function showInstallBanner(deferredPrompt) {
    if (!document.getElementById('installBanner')) {
        const banner = document.createElement('div');
        banner.id = 'installBanner';
        banner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 z-50 flex items-center justify-between shadow-lg';
        banner.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-lg">📱</span>
                <span class="text-sm font-medium">¡Instala Glucómetro Digital en tu dispositivo!</span>
            </div>
            <div class="flex gap-2">
                <button id="installBtn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-100 transition-colors">
                    Instalar
                </button>
                <button id="dismissBtn" class="text-white hover:text-gray-200 text-lg">
                    ✕
                </button>
            </div>
        `;
        document.body.prepend(banner);
        document.body.style.paddingTop = '60px';
        document.getElementById('installBtn').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`PWA: Usuario ${outcome} la instalación`);
                deferredPrompt = null;
                hideInstallBanner();
            }
        });
        document.getElementById('dismissBtn').addEventListener('click', () => {
            hideInstallBanner();
        });
    }
}

function hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.remove();
        document.body.style.paddingTop = '0';
    }
}

class NotificationScheduler {
    constructor() {
        this.scheduledTimes = [
            { time: '07:30', message: '🌅 ¡Hora de medir tu glucosa antes del desayuno!' },
            { time: '09:00', message: '🍳 ¿Ya mediste tu glucosa después del desayuno?' },
            { time: '12:45', message: '☀️ ¡Hora de medir tu glucosa antes del almuerzo!' },
            { time: '14:00', message: '🍽️ ¿Ya mediste tu glucosa después del almuerzo?' },
            { time: '18:30', message: '🌙 ¡Hora de medir tu glucosa antes de la cena!' },
            { time: '20:00', message: '🍽️ ¿Ya mediste tu glucosa después de la cena?' }
        ];
        this.notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        this.checkInterval = null;
        this.lastNotificationDate = {};
        this.missingDataInterval = null;
        this.lastMissingDataCheck = null;
    }

    async requestPermission() {
        console.log('Solicitando permisos de notificación...');
        if (!('Notification' in window)) {
            console.log('Las notificaciones no están soportadas en este navegador');
            return false;
        }
        if (Notification.permission === 'granted') {
            this.notificationsEnabled = true;
            localStorage.setItem('notificationsEnabled', 'true');
            return true;
        }
        if (Notification.permission === 'denied') {
            this.notificationsEnabled = false;
            localStorage.setItem('notificationsEnabled', 'false');
            return false;
        }
        try {
            const permission = await Notification.requestPermission();
            this.notificationsEnabled = permission === 'granted';
            localStorage.setItem('notificationsEnabled', this.notificationsEnabled ? 'true' : 'false');
            return this.notificationsEnabled;
        } catch (error) {
            console.error('Error al solicitar permisos:', error);
            this.notificationsEnabled = false;
            localStorage.setItem('notificationsEnabled', 'false');
            return false;
        }
    }

    async showNotification(title, message) {
        if (this.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            try {
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.showNotification(title, {
                        body: message,
                        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIHJ4PSIyNCIgZmlsbD0iIzNCODJGNiIvPjx0ZXh0IHg9Ijk2IiB5PSIxMTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfqbI8L3RleHQ+PC9zdmc+',
                        badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzNiIgY3k9IjM2IiByPSIzNiIgZmlsbD0iIzNCODJGNiIvPjx0ZXh0IHg9IjM2IiB5PSI0NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+psjwvdGV4dD48L3N2Zz4=',
                        tag: 'glucose-reminder',
                        requireInteraction: true,
                        vibrate: [200, 100, 200],
                        actions: [
                            {
                                action: 'open',
                                title: 'Abrir App'
                            }
                        ]
                    });
                    console.log('Notificación programada enviada vía Service Worker:', title);
                } else {
                    const notification = new Notification(title, {
                        body: message,
                        icon: '🩺',
                        badge: '🩺',
                        tag: 'glucose-reminder',
                        requireInteraction: true
                    });
                    notification.onclick = function() {
                        window.focus();
                        notification.close();
                    };
                    console.log('Notificación programada enviada:', title);
                }
            } catch (error) {
                console.error('Error al enviar notificación programada:', error);
                this.showInAppAlert(message, 'warning');
                return;
            }
        }
        this.showInAppAlert(message);
    }

    showInAppAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        let bgColor, textColor, buttonBg, buttonText;
        let icon = '🩺';
        switch(type) {
            case 'warning':
                bgColor = 'bg-yellow-500';
                textColor = 'text-white';
                buttonBg = 'bg-white';
                buttonText = 'text-yellow-500';
                icon = '⚠️';
                break;
            case 'error':
                bgColor = 'bg-red-500';
                textColor = 'text-white';
                buttonBg = 'bg-white';
                buttonText = 'text-red-500';
                icon = '🚨';
                break;
            default:
                bgColor = 'bg-blue-500';
                textColor = 'text-white';
                buttonBg = 'bg-white';
                buttonText = 'text-blue-500';
                icon = '🩺';
        }
        alertDiv.className = `mobile-alert ${bgColor} ${textColor} p-4 rounded-lg animate-fade-in`;
        alertDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-xl">${icon}</span>
                    <span class="text-sm font-medium">${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="${textColor} hover:opacity-70 ml-2">
                    ✕
                </button>
            </div>
            <div class="mt-2 flex gap-2">
                <button onclick="document.getElementById('homeTab').click(); this.parentElement.parentElement.remove()" class="${buttonBg} ${buttonText} px-3 py-1 rounded text-xs font-medium hover:opacity-80">
                    Ir a medir
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="${bgColor.replace('bg-', 'bg-opacity-80 bg-')} ${textColor} px-3 py-1 rounded text-xs font-medium hover:opacity-80">
                    Más tarde
                </button>
            </div>
        `;
        document.body.appendChild(alertDiv);
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 30000);
    }

    getCurrentTime() {
        const now = new Date();
        return now.getHours().toString().padStart(2, '0') + ':' +
               now.getMinutes().toString().padStart(2, '0');
    }

    getCurrentDate() {
        return new Date().toDateString();
    }

    checkScheduledNotifications() {
        const currentTime = this.getCurrentTime();
        const currentDate = this.getCurrentDate();
        this.scheduledTimes.forEach((schedule, index) => {
            if (currentTime === schedule.time) {
                const notificationKey = `${currentDate}-${index}`;
                if (!this.lastNotificationDate[notificationKey]) {
                    this.showNotification('Recordatorio de Glucometría', schedule.message);
                    this.lastNotificationDate[notificationKey] = true;
                    this.cleanOldNotifications();
                }
            }
        });
    }

    cleanOldNotifications() {
        const currentDate = this.getCurrentDate();
        const keys = Object.keys(this.lastNotificationDate);
        keys.forEach(key => {
            const [date] = key.split('-');
            if (date !== currentDate) {
                delete this.lastNotificationDate[key];
            }
        });
    }

    start() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.checkInterval = setInterval(() => {
            this.checkScheduledNotifications();
        }, 60000);
        this.checkScheduledNotifications();
        this.startMissingDataCheck();
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.missingDataInterval) {
            clearInterval(this.missingDataInterval);
            this.missingDataInterval = null;
        }
    }

    startMissingDataCheck() {
        this.checkMissingData();
        if (!this.missingDataInterval) {
            this.missingDataInterval = setInterval(() => {
                this.checkMissingData();
            }, 3600000);
        }
    }

    checkMissingData() {
        const today = new Date();
        const history = JSON.parse(localStorage.getItem('glucometro_history') || '[]');
        const missingDays = this.findMissingDataDays(history, today);
        if (missingDays.length > 0) {
            const oldestMissingDay = missingDays[missingDays.length - 1];
            const daysAgo = Math.floor((today - oldestMissingDay) / (1000 * 60 * 60 * 24));
            let message;
            if (daysAgo === 1) {
                message = '⚠️ Tienes datos pendientes de ayer. ¡Completa tu registro de glucosa!';
            } else {
                message = `⚠️ Tienes datos pendientes de hace ${daysAgo} días. ¡Completa tus registros de glucosa!`;
            }
            this.showNotification('Datos Faltantes', message);
            this.showInAppAlert(message, 'warning');
        }
    }

    findMissingDataDays(history, currentDate) {
        const missingDays = [];
        const today = new Date(currentDate);
        today.setHours(0, 0, 0, 0);
        for (let i = 1; i <= 5; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateString = checkDate.toISOString().split('T')[0];
            const hasCompleteRecord = history.some(record => {
                const recordDate = new Date(record.timestamp);
                recordDate.setHours(0, 0, 0, 0);
                const recordDateString = recordDate.toISOString().split('T')[0];
                return recordDateString === dateString &&
                       record.type === 'complete' &&
                       this.isRecordComplete(record);
            });
            if (!hasCompleteRecord) {
                missingDays.push(checkDate);
            }
        }
        return missingDays;
    }

    isRecordComplete(record) {
        const measurements = record.measurements;
        return measurements.beforeBreakfast &&
               measurements.afterBreakfast &&
               measurements.beforeLunch &&
               measurements.afterLunch &&
               measurements.beforeDinner &&
               measurements.afterDinner;
    }

    getStatus() {
        return {
            enabled: this.notificationsEnabled,
            running: this.checkInterval !== null,
            scheduledTimes: this.scheduledTimes
        };
    }
}

export const notificationScheduler = new NotificationScheduler();
