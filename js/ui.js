// js/ui.js

import { getHistory, getTargetRanges, saveTargetRanges, deleteRecord, clearHistory as clearStorageHistory } from './storage.js';
import { analyzeGlucoseData, generateRecommendations } from './analysis.js';

const form = document.getElementById('glucoseForm');
const resultsSection = document.getElementById('results');
const alertsContainer = document.getElementById('alerts');
const statisticsContainer = document.getElementById('statistics');
const recommendationsContainer = document.getElementById('recommendations');
const historySummaryContainer = document.getElementById('historySummary');
const historyListContainer = document.getElementById('historyList');

export function showAlert(message, type = 'warning') {
    const alertDiv = document.createElement('div');
    let alertClass, icon;

    switch(type) {
        case 'success':
            alertClass = 'bg-green-100 border-green-300 text-green-800';
            icon = '✅';
            break;
        case 'danger':
            alertClass = 'bg-red-100 border-red-300 text-red-800';
            icon = '🚨';
            break;
        case 'info':
            alertClass = 'bg-blue-100 border-blue-300 text-blue-800';
            icon = 'ℹ️';
            break;
        default:
            alertClass = 'bg-yellow-100 border-yellow-300 text-yellow-800';
            icon = '⚠️';
    }

    alertDiv.className = `mobile-alert ${alertClass} border-2 flex items-center gap-3 animate-fade-in`;
    alertDiv.innerHTML = `
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
                <span class="text-xl">${icon}</span>
                <div class="text-sm font-medium">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-current hover:opacity-70 ml-2">
                ✕
            </button>
        </div>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

export function getFormData() {
    return {
        beforeBreakfast: parseFloat(document.getElementById('beforeBreakfast').value),
        afterBreakfast: parseFloat(document.getElementById('afterBreakfast').value),
        beforeLunch: parseFloat(document.getElementById('beforeLunch').value),
        afterLunch: parseFloat(document.getElementById('afterLunch').value),
        beforeDinner: parseFloat(document.getElementById('beforeDinner').value),
        afterDinner: parseFloat(document.getElementById('afterDinner').value),
        insulinBreakfast: parseFloat(document.getElementById('insulinBreakfast').value) || 0,
        insulinLunch: parseFloat(document.getElementById('insulinLunch').value) || 0,
        insulinDinner: parseFloat(document.getElementById('insulinDinner').value) || 0
    };
}

export function validateData(data) {
    const requiredFields = ['beforeBreakfast', 'afterBreakfast', 'beforeLunch', 'afterLunch', 'beforeDinner', 'afterDinner'];

    for (let field of requiredFields) {
        if (isNaN(data[field]) || data[field] <= 0) {
            showAlert('Por favor, complete todos los campos de glucosa con valores válidos.', 'warning');
            return false;
        }

        if (data[field] < 50 || data[field] > 500) {
            showAlert('Los valores de glucosa deben estar entre 50 y 500 mg/dL.', 'warning');
            return false;
        }
    }

    return true;
}

export function displayResults(analysis) {
    alertsContainer.innerHTML = '';
    statisticsContainer.innerHTML = '';
    recommendationsContainer.innerHTML = '';

    displayAlerts(analysis.alerts, analysis.statistics);
    displayStatistics(analysis.statistics);
    displayRecommendations(analysis);

    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function displayAlerts(alerts, statistics) {
    if (alerts.length === 0) {
        alertsContainer.innerHTML = `
            <div class="bg-green-100 border-2 border-green-300 text-green-800 p-4 rounded-xl mb-4 flex items-center gap-3 animate-fade-in">
                <span class="text-2xl">✅</span>
                <div>
                    <strong class="block text-lg">¡Excelente!</strong>
                    <span class="text-sm">Todos los niveles de glucosa están dentro de los rangos recomendados.</span>
                </div>
            </div>
        `;
    } else {
        let alertsHTML = '';
        alerts.forEach(alert => {
            const alertClass = alert.type === 'danger' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-yellow-100 border-yellow-300 text-yellow-800';
            alertsHTML += `
                <div class="${alertClass} p-4 rounded-xl mb-4 border-2 animate-fade-in">
                    <div>
                        <strong class="block text-lg">${alert.message}</strong>
                        <small class="text-sm opacity-80">${alert.detail}</small>
                    </div>
                </div>
            `;
        });

        if (statistics.badPercentage > 50) {
            alertsHTML += `
                <div class="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-xl mb-4 flex items-center gap-3 animate-fade-in">
                    <span class="text-2xl">🚨</span>
                    <div>
                        <strong class="block text-lg">ATENCIÓN URGENTE</strong>
                        <span class="text-sm">Más del 50% de sus lecturas están fuera del rango normal. Consulte a su médico inmediatamente.</span>
                    </div>
                </div>
            `;
        }

        alertsContainer.innerHTML = alertsHTML;
    }
}

function displayStatistics(stats) {
    statisticsContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-white p-4 rounded-xl text-center border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
                <div class="text-2xl font-bold mb-2 text-green-600">${stats.goodReadings}</div>
                <div class="text-gray-600 font-medium text-xs">Lecturas Normales</div>
            </div>
            <div class="bg-white p-4 rounded-xl text-center border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
                <div class="text-2xl font-bold mb-2 text-red-600">${stats.badReadings}</div>
                <div class="text-gray-600 font-medium text-xs">Lecturas Elevadas</div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div class="bg-white p-4 rounded-xl text-center border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
                <div class="text-2xl font-bold mb-2 ${stats.badPercentage <= 30 ? 'text-green-600' : 'text-red-600'}">${stats.badPercentage}%</div>
                <div class="text-gray-600 font-medium text-xs">Lecturas Dañinas</div>
            </div>
            <div class="bg-white p-4 rounded-xl text-center border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
                <div class="text-2xl font-bold mb-2 text-blue-600">${stats.totalInsulin}</div>
                <div class="text-gray-600 font-medium text-xs">Insulina Total</div>
            </div>
        </div>
        <div class="bg-white p-4 rounded-xl text-center border-2 border-gray-200 hover:shadow-lg transition-all duration-300 mt-3">
            <div class="text-2xl font-bold mb-2 text-purple-600">${stats.stdDev.toFixed(2)}</div>
            <div class="text-gray-600 font-medium text-xs">Desviación Estándar</div>
        </div>
    `;
}

function displayRecommendations(analysis) {
    const recommendations = generateRecommendations(analysis);
    let recommendationsHTML = '<div class="bg-white p-6 rounded-xl border-2 border-gray-200"><h3 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2"><span>💡</span> Recomendaciones Personalizadas</h3><ul class="space-y-3">';
    recommendations.forEach(rec => {
        recommendationsHTML += `<li class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"><span class="text-xl flex-shrink-0">${rec.icon}</span><span class="text-gray-700">${rec.text}</span></li>`;
    });
    recommendationsHTML += '</ul></div>';
    recommendationsContainer.innerHTML = recommendationsHTML;
}

export function clearForm() {
    if (confirm('¿Está seguro de que desea limpiar todos los datos?')) {
        form.reset();
        resultsSection.style.display = 'none';
        document.getElementById('beforeBreakfast').focus();
        showAlert('Formulario limpiado correctamente.', 'success');
    }
}

function createMealSection(meal) {
    const { id, title, color, icon } = meal;
    return `
        <div class="bg-white rounded-xl p-3 card-shadow">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-bold text-${color}-600 flex items-center gap-1">
                    ${icon} ${title}
                </h2>
                <button type="button" id="save${id}Btn" class="bg-${color}-500 hover:bg-${color}-600 text-white font-semibold px-3 py-1 rounded-lg text-xs transition-all duration-200">
                    Guardar
                </button>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label for="before${id}" class="block text-xs font-medium text-gray-600 mb-1">
                        Antes
                    </label>
                    <input type="number" id="before${id}" name="before${id}"
                           class="mobile-input w-full px-2 py-2 border border-gray-200 rounded-lg focus:border-${color}-400 text-sm text-center"
                           placeholder="85" min="50" max="500">
                </div>
                <div>
                    <label for="after${id}" class="block text-xs font-medium text-gray-600 mb-1">
                        Después
                    </label>
                    <input type="number" id="after${id}" name="after${id}"
                           class="mobile-input w-full px-2 py-2 border border-gray-200 rounded-lg focus:border-${color}-400 text-sm text-center"
                           placeholder="120" min="50" max="500">
                </div>
                <div>
                    <label for="insulin${id}" class="block text-xs font-medium text-gray-600 mb-1">
                        Insulina
                    </label>
                    <input type="number" id="insulin${id}" name="insulin${id}"
                           class="mobile-input w-full px-2 py-2 border border-gray-200 rounded-lg focus:border-${color}-400 text-sm text-center"
                           placeholder="4" min="0" max="100" step="0.5">
                </div>
            </div>
        </div>
    `;
}

export function initializeMealSections() {
    const mealSectionsContainer = document.getElementById('mealSections');
    const meals = [
        { id: 'Breakfast', title: 'Desayuno', color: 'orange', icon: '🌅' },
        { id: 'Lunch', title: 'Almuerzo', color: 'yellow', icon: '☀️' },
        { id: 'Dinner', title: 'Cena', color: 'purple', icon: '🌙' }
    ];

    mealSectionsContainer.innerHTML = meals.map(createMealSection).join('');
}

export async function initializeDateSelector() {
    const dateInput = document.getElementById('recordDate');
    const timeInput = document.getElementById('recordTime');
    const todayBtn = document.getElementById('todayBtn');
    const editCheckbox = document.getElementById('enableEditMode');

    const now = new Date();
    dateInput.value = now.toISOString().split('T')[0];
    timeInput.value = now.toTimeString().slice(0, 5);
    dateInput.max = now.toISOString().split('T')[0];

    loadDataForSelectedDate();

    dateInput.addEventListener('change', function() {
        loadDataForSelectedDate();
    });

    todayBtn.addEventListener('click', function() {
        const current = new Date();
        dateInput.value = current.toISOString().split('T')[0];
        timeInput.value = current.toTimeString().slice(0, 5);
        clearFormFields();
        enableAllFields();
        showAlert('Fecha establecida a hoy. Puede ingresar nuevos datos.', 'info');
        const originalText = todayBtn.innerHTML;
        todayBtn.innerHTML = '✅ Hoy';
        todayBtn.classList.add('bg-green-500');
        todayBtn.classList.remove('bg-blue-500');
        setTimeout(() => {
            todayBtn.innerHTML = originalText;
            todayBtn.classList.remove('bg-green-500');
            todayBtn.classList.add('bg-blue-500');
        }, 1500);
    });

    if (editCheckbox) {
        editCheckbox.addEventListener('change', function() {
            if (this.checked) {
                enableAllFields();
                showAlert('Modo de edición activado. Puede modificar los datos.', 'success');
            } else {
                const selectedDate = new Date(dateInput.value).toLocaleDateString('es-ES');
                const today = new Date().toLocaleDateString('es-ES');
                if (selectedDate !== today) {
                    disableAllFields();
                    showAlert('Modo de edición desactivado.', 'info');
                }
            }
        });
    }
}

async function loadDataForSelectedDate() {
    const dateInput = document.getElementById('recordDate');
    if (!dateInput.value) {
        enableAllFields();
        return;
    }

    const selectedDate = new Date(dateInput.value).toLocaleDateString('es-ES');
    const history = await getHistory();
    const recordsForDate = history.filter(record => record.date === selectedDate);

    clearFormFields();

    if (recordsForDate.length === 0) {
        enableAllFields();
        showAlert(`No se encontraron registros para ${selectedDate}`, 'info');
        return;
    }

    let completeRecord = recordsForDate.find(record => record.type === 'complete');

    if (completeRecord) {
        loadCompleteRecord(completeRecord);
        disableAllFields();
        showAlert(`Datos cargados para ${selectedDate}. Use la casilla de edición para modificar.`, 'success');
    } else {
        loadMealRecords(recordsForDate, selectedDate);
        disableAllFields();
        showAlert(`Datos parciales cargados para ${selectedDate}. Use la casilla de edición para modificar.`, 'info');
    }
}

function clearFormFields() {
    document.getElementById('beforeBreakfast').value = '';
    document.getElementById('afterBreakfast').value = '';
    document.getElementById('insulinBreakfast').value = '';
    document.getElementById('beforeLunch').value = '';
    document.getElementById('afterLunch').value = '';
    document.getElementById('insulinLunch').value = '';
    document.getElementById('beforeDinner').value = '';
    document.getElementById('afterDinner').value = '';
    document.getElementById('insulinDinner').value = '';
}

function disableAllFields() {
    const fields = [
        'beforeBreakfast', 'afterBreakfast', 'insulinBreakfast',
        'beforeLunch', 'afterLunch', 'insulinLunch',
        'beforeDinner', 'afterDinner', 'insulinDinner'
    ];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.disabled = true;
            field.classList.add('bg-gray-100', 'cursor-not-allowed');
        }
    });
    const mealButtons = ['saveBreakfastBtn', 'saveLunchBtn', 'saveDinnerBtn'];
    mealButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function enableAllFields() {
    const fields = [
        'beforeBreakfast', 'afterBreakfast', 'insulinBreakfast',
        'beforeLunch', 'afterLunch', 'insulinLunch',
        'beforeDinner', 'afterDinner', 'insulinDinner'
    ];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.disabled = false;
            field.classList.remove('bg-gray-100', 'cursor-not-allowed');
        }
    });
    const mealButtons = ['saveBreakfastBtn', 'saveLunchBtn', 'saveDinnerBtn'];
    mealButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function loadCompleteRecord(record) {
    const measurements = record.measurements;
    if (measurements.beforeBreakfast) document.getElementById('beforeBreakfast').value = measurements.beforeBreakfast;
    if (measurements.afterBreakfast) document.getElementById('afterBreakfast').value = measurements.afterBreakfast;
    if (measurements.insulinBreakfast) document.getElementById('insulinBreakfast').value = measurements.insulinBreakfast;
    if (measurements.beforeLunch) document.getElementById('beforeLunch').value = measurements.beforeLunch;
    if (measurements.afterLunch) document.getElementById('afterLunch').value = measurements.afterLunch;
    if (measurements.insulinLunch) document.getElementById('insulinLunch').value = measurements.insulinLunch;
    if (measurements.beforeDinner) document.getElementById('beforeDinner').value = measurements.beforeDinner;
    if (measurements.afterDinner) document.getElementById('afterDinner').value = measurements.afterDinner;
    if (measurements.insulinDinner) document.getElementById('insulinDinner').value = measurements.insulinDinner;
}

function loadMealRecords(records, selectedDate) {
    let loadedMeals = [];
    records.forEach(record => {
        if (record.type === 'meal' && record.mealType) {
            const measurements = record.measurements;
            switch(record.mealType) {
                case 'breakfast':
                    if (measurements.beforeBreakfast) document.getElementById('beforeBreakfast').value = measurements.beforeBreakfast;
                    if (measurements.afterBreakfast) document.getElementById('afterBreakfast').value = measurements.afterBreakfast;
                    if (measurements.insulinBreakfast) document.getElementById('insulinBreakfast').value = measurements.insulinBreakfast;
                    loadedMeals.push('Desayuno');
                    break;
                case 'lunch':
                    if (measurements.beforeLunch) document.getElementById('beforeLunch').value = measurements.beforeLunch;
                    if (measurements.afterLunch) document.getElementById('afterLunch').value = measurements.afterLunch;
                    if (measurements.insulinLunch) document.getElementById('insulinLunch').value = measurements.insulinLunch;
                    loadedMeals.push('Almuerzo');
                    break;
                case 'dinner':
                    if (measurements.beforeDinner) document.getElementById('beforeDinner').value = measurements.beforeDinner;
                    if (measurements.afterDinner) document.getElementById('afterDinner').value = measurements.afterDinner;
                    if (measurements.insulinDinner) document.getElementById('insulinDinner').value = measurements.insulinDinner;
                    loadedMeals.push('Cena');
                    break;
            }
        }
    });
    if (loadedMeals.length > 0) {
        showAlert(`Datos cargados para ${selectedDate}: ${loadedMeals.join(', ')}`, 'success');
    } else {
        showAlert(`No se encontraron datos válidos para ${selectedDate}`, 'info');
    }
}

export function getSelectedDateTime() {
    const dateInput = document.getElementById('recordDate');
    const timeInput = document.getElementById('recordTime');
    if (!dateInput.value || !timeInput.value) {
        const now = new Date();
        return {
            date: now.toLocaleDateString('es-ES'),
            time: now.toLocaleTimeString('es-ES'),
            timestamp: now.toISOString(),
            dateObject: now
        };
    }
    const selectedDate = new Date(dateInput.value + 'T' + timeInput.value);
    return {
        date: selectedDate.toLocaleDateString('es-ES'),
        time: selectedDate.toLocaleTimeString('es-ES'),
        timestamp: selectedDate.toISOString(),
        dateObject: selectedDate
    };
}

export async function displayHistory() {
    const history = await getHistory();
    if (history.length === 0) {
        historySummaryContainer.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <div class="text-4xl mb-4">📊</div>
                <div class="text-lg font-medium">No hay registros guardados</div>
                <div class="text-sm">Realice una medición para comenzar su historial</div>
            </div>
        `;
        historyListContainer.innerHTML = '';
        return;
    }
    const filteredHistory = applyHistoryFilters(history);
    if (filteredHistory.length === 0 && history.length > 0) {
        historySummaryContainer.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <div class="text-4xl mb-4">🔍</div>
                <div class="text-lg font-medium">No se encontraron registros</div>
                <div class="text-sm">Ajuste los filtros para ver más resultados</div>
                <button onclick="clearHistoryFilters()" class="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
                    Limpiar filtros
                </button>
            </div>
        `;
        historyListContainer.innerHTML = '';
        return;
    }
    displayHistorySummary(filteredHistory);
    displayHistoryList(filteredHistory);
}

function applyHistoryFilters(history) {
    const filterDateFrom = document.getElementById('filterDateFrom')?.value;
    const filterDateTo = document.getElementById('filterDateTo')?.value;
    const filterRecordType = document.getElementById('filterRecordType')?.value || 'all';
    let filtered = [...history];
    if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        filtered = filtered.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= fromDate;
        });
    }
    if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate <= toDate;
        });
    }
    switch (filterRecordType) {
        case 'complete':
            filtered = filtered.filter(record => record.type === 'complete');
            break;
        case 'meal':
            filtered = filtered.filter(record => record.type === 'meal');
            break;
        case 'alerts':
            filtered = filtered.filter(record => record.alertsCount > 0);
            break;
    }
    return filtered;
}

export function clearHistoryFilters() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterRecordType').value = 'all';
    displayHistory();
    showAlert('Filtros limpiados correctamente.', 'info');
}

export function initializeHistoryFilters() {
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    const filterRecordType = document.getElementById('filterRecordType');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (filterDateFrom) {
        filterDateFrom.addEventListener('change', displayHistory);
    }
    if (filterDateTo) {
        filterDateTo.addEventListener('change', displayHistory);
    }
    if (filterRecordType) {
        filterRecordType.addEventListener('change', displayHistory);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearHistoryFilters);
    }
}

async function displayTrendsChart(history) {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    const labels = history.map(record => new Date(record.timestamp).toLocaleDateString('es-ES'));
    const beforeMealData = history.map(record => record.measurements.beforeBreakfast);
    const afterMealData = history.map(record => record.measurements.afterBreakfast);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Antes de Comer',
                    data: beforeMealData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                },
                {
                    label: 'Después de Comer',
                    data: afterMealData,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function displayDistributionChart(history) {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    const goodReadings = history.reduce((sum, record) => sum + record.statistics.goodReadings, 0);
    const badReadings = history.reduce((sum, record) => sum + record.statistics.badReadings, 0);

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Lecturas Normales', 'Lecturas Elevadas'],
            datasets: [{
                label: 'Distribución de Lecturas',
                data: [goodReadings, badReadings],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(255, 99, 132, 0.2)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
        }
    });
}

async function displayMealAverageChart(history) {
    const ctx = document.getElementById('mealAverageChart').getContext('2d');
    const breakfast = [];
    const lunch = [];
    const dinner = [];

    history.forEach(record => {
        if (record.measurements.beforeBreakfast) breakfast.push(record.measurements.beforeBreakfast);
        if (record.measurements.afterBreakfast) breakfast.push(record.measurements.afterBreakfast);
        if (record.measurements.beforeLunch) lunch.push(record.measurements.beforeLunch);
        if (record.measurements.afterLunch) lunch.push(record.measurements.afterLunch);
        if (record.measurements.beforeDinner) dinner.push(record.measurements.beforeDinner);
        if (record.measurements.afterDinner) dinner.push(record.measurements.afterDinner);
    });

    const breakfastAvg = breakfast.length > 0 ? breakfast.reduce((a, b) => a + b, 0) / breakfast.length : 0;
    const lunchAvg = lunch.length > 0 ? lunch.reduce((a, b) => a + b, 0) / lunch.length : 0;
    const dinnerAvg = dinner.length > 0 ? dinner.reduce((a, b) => a + b, 0) / dinner.length : 0;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Desayuno', 'Almuerzo', 'Cena'],
            datasets: [{
                label: 'Promedio de Glucosa',
                data: [breakfastAvg, lunchAvg, dinnerAvg],
                backgroundColor: [
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 205, 86, 0.2)',
                    'rgba(153, 102, 255, 0.2)'
                ],
                borderColor: [
                    'rgb(255, 159, 64)',
                    'rgb(255, 205, 86)',
                    'rgb(153, 102, 255)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function displayHistorySummary(history) {
    displayTrendsChart(history);
    displayDistributionChart(history);
    displayMealAverageChart(history);
    const totalRecords = history.length;
    const totalReadings = history.reduce((sum, record) => {
        let count = 0;
        if (record.measurements.beforeBreakfast) count++;
        if (record.measurements.afterBreakfast) count++;
        if (record.measurements.beforeLunch) count++;
        if (record.measurements.afterLunch) count++;
        if (record.measurements.beforeDinner) count++;
        if (record.measurements.afterDinner) count++;
        return sum + count;
    }, 0);
    const beforeMealReadings = [];
    const afterMealReadings = [];
    let totalInsulin = 0;
    let alertsCount = 0;
    history.forEach(record => {
        if (record.measurements.beforeBreakfast) beforeMealReadings.push(record.measurements.beforeBreakfast);
        if (record.measurements.beforeLunch) beforeMealReadings.push(record.measurements.beforeLunch);
        if (record.measurements.beforeDinner) beforeMealReadings.push(record.measurements.beforeDinner);
        if (record.measurements.afterBreakfast) afterMealReadings.push(record.measurements.afterBreakfast);
        if (record.measurements.afterLunch) afterMealReadings.push(record.measurements.afterLunch);
        if (record.measurements.afterDinner) afterMealReadings.push(record.measurements.afterDinner);
        totalInsulin += (record.measurements.insulinBreakfast || 0);
        totalInsulin += (record.measurements.insulinLunch || 0);
        totalInsulin += (record.measurements.insulinDinner || 0);
        alertsCount += (record.alertsCount || 0);
    });
    const averageBeforeMeals = beforeMealReadings.length > 0 ?
        (beforeMealReadings.reduce((sum, reading) => sum + reading, 0) / beforeMealReadings.length).toFixed(1) : 0;
    const averageAfterMeals = afterMealReadings.length > 0 ?
        (afterMealReadings.reduce((sum, reading) => sum + reading, 0) / afterMealReadings.length).toFixed(1) : 0;
    const targetRanges = getTargetRanges();
    const badBeforeMealReadings = beforeMealReadings.filter(reading => reading > targetRanges.beforeMeal).length;
    const badAfterMealReadings = afterMealReadings.filter(reading => reading > targetRanges.afterMeal).length;
    const totalBadReadings = badBeforeMealReadings + badAfterMealReadings;
    const totalReadingsCount = beforeMealReadings.length + afterMealReadings.length;
    const averageBadPercentage = totalReadingsCount > 0 ?
        ((totalBadReadings / totalReadingsCount) * 100).toFixed(1) : '0';
    const dates = history.map(record => new Date(record.timestamp)).sort((a, b) => a - b);
    const firstDate = dates[0]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) || 'N/A';
    const lastDate = dates[dates.length - 1]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) || 'N/A';
    const uniqueDays = new Set(history.map(record => record.date)).size;

    historySummaryContainer.innerHTML = `
        <div class="col-span-2 mb-3">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                    📊 Resumen General
                </h3>
                <span class="text-xs text-gray-500">${firstDate} - ${lastDate}</span>
            </div>
        </div>
        <div class="col-span-2 grid grid-cols-2 gap-2 mb-3">
            <div class="bg-gradient-to-br ${averageBadPercentage <= 20 ? 'from-green-50 to-green-100 border-green-200' : averageBadPercentage <= 40 ? 'from-yellow-50 to-yellow-100 border-yellow-200' : 'from-red-50 to-red-100 border-red-200'} p-3 rounded-lg border text-center hover:shadow-md transition-shadow duration-200">
                <div class="text-lg font-bold ${averageBadPercentage <= 20 ? 'text-green-800' : averageBadPercentage <= 40 ? 'text-yellow-800' : 'text-red-800'}">
                    ${averageBadPercentage <= 20 ? '✅' : averageBadPercentage <= 40 ? '⚠️' : '🚨'} ${averageBadPercentage}%
                </div>
                <div class="text-xs ${averageBadPercentage <= 20 ? 'text-green-600' : averageBadPercentage <= 40 ? 'text-yellow-600' : 'text-red-600'} font-medium">Lecturas altas</div>
                <div class="text-xs ${averageBadPercentage <= 20 ? 'text-green-500' : averageBadPercentage <= 40 ? 'text-yellow-500' : 'text-red-500'} mt-1">
                    ${averageBadPercentage <= 20 ? 'Excelente control' : averageBadPercentage <= 40 ? 'Control regular' : 'Requiere atención'}
                </div>
            </div>
            <div class="bg-gradient-to-br ${alertsCount === 0 ? 'from-green-50 to-green-100 border-green-200' : alertsCount <= 5 ? 'from-yellow-50 to-yellow-100 border-yellow-200' : 'from-red-50 to-red-100 border-red-200'} p-3 rounded-lg border text-center hover:shadow-md transition-shadow duration-200">
                <div class="text-lg font-bold ${alertsCount === 0 ? 'text-green-800' : alertsCount <= 5 ? 'text-yellow-800' : 'text-red-800'}">
                    ${alertsCount === 0 ? '🎉' : alertsCount <= 5 ? '⚠️' : '🚨'} ${alertsCount}
                </div>
                <div class="text-xs ${alertsCount === 0 ? 'text-green-600' : alertsCount <= 5 ? 'text-yellow-600' : 'text-red-600'} font-medium">Alertas totales</div>
                <div class="text-xs ${alertsCount === 0 ? 'text-green-500' : alertsCount <= 5 ? 'text-yellow-500' : 'text-red-500'} mt-1">
                    ${alertsCount === 0 ? 'Sin problemas' : alertsCount <= 5 ? 'Pocas alertas' : 'Muchas alertas'}
                </div>
            </div>
        </div>
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-purple-800">${averageBeforeMeals}</div>
            <div class="text-xs text-purple-600 font-medium">Promedio antes</div>
            <div class="text-xs text-purple-500 mt-1">mg/dL</div>
        </div>
        <div class="bg-gradient-to-br from-teal-50 to-teal-100 p-3 rounded-lg border border-teal-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-teal-800">${averageAfterMeals}</div>
            <div class="text-xs text-teal-600 font-medium">Promedio después</div>
            <div class="text-xs text-teal-500 mt-1">mg/dL</div>
        </div>
        <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-orange-800">${totalInsulin}</div>
            <div class="text-xs text-orange-600 font-medium">Insulina total</div>
            <div class="text-xs text-orange-500 mt-1">unidades</div>
        </div>
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-blue-800">${uniqueDays}</div>
            <div class="text-xs text-blue-600 font-medium">Días registrados</div>
            <div class="text-xs text-blue-500 mt-1">${totalRecords} entradas</div>
        </div>
    `;
}

async function displayHistoryList(history) {
    if (history.length === 0) {
        historyListContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No hay registros guardados</div>';
        return;
    }
    const targetRanges = await getTargetRanges();
    const listHTML = history.map((record, index) => {
        const date = new Date(record.timestamp).toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const time = new Date(record.timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const measurements = record.measurements;
        const totalInsulin = (measurements.insulinBreakfast || 0) +
                            (measurements.insulinLunch || 0) +
                            (measurements.insulinDinner || 0);
        const recordType = record.type === 'complete' ? 'Completo' :
                          record.mealType ? getMealName(record.mealType) : 'Parcial';
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-3 mb-3 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-sm font-bold text-gray-800">${date}</h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                record.type === 'complete' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }">
                                ${recordType}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 flex items-center gap-1">
                            🕐 ${time}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${totalInsulin > 0 ? `
                            <div class="text-right">
                                <div class="text-xs text-gray-500">Insulina Total</div>
                                <span class="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700">
                                    ${totalInsulin}u
                                </span>
                            </div>
                        ` : ''}
                        <button data-index="${index}" class="delete-record-btn p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors duration-200" title="Eliminar registro">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-2 text-xs">
                    ${measurements.beforeBreakfast || measurements.afterBreakfast || measurements.insulinBreakfast ? `
                        <div class="bg-gradient-to-r from-orange-50 to-orange-100 p-2 rounded-lg border border-orange-200">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm">🌅</span>
                                    <span class="font-semibold text-orange-800 text-sm">Desayuno</span>
                                </div>
                                ${measurements.insulinBreakfast ? `<span class="bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-medium text-xs">${measurements.insulinBreakfast}u</span>` : ''}
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                ${measurements.beforeBreakfast ? `
                                    <div class="bg-white p-2 rounded border text-center">
                                        <div class="text-orange-600 font-medium text-xs">Antes</div>
                                        <div class="text-sm font-bold ${measurements.beforeBreakfast > targetRanges.beforeMeal ? 'text-red-600' : 'text-orange-800'}">${measurements.beforeBreakfast} mg/dL</div>
                                    </div>
                                ` : ''}
                                ${measurements.afterBreakfast ? `
                                    <div class="bg-white p-2 rounded border text-center">
                                        <div class="text-orange-600 font-medium text-xs">Después</div>
                                        <div class="text-sm font-bold ${measurements.afterBreakfast > targetRanges.afterMeal ? 'text-red-600' : 'text-orange-800'}">${measurements.afterBreakfast} mg/dL</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    ${measurements.beforeLunch || measurements.afterLunch || measurements.insulinLunch ? `
                        <div class="bg-gradient-to-r from-yellow-50 to-yellow-100 p-2 rounded-lg border border-yellow-200">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm">☀️</span>
                                    <span class="font-semibold text-yellow-800 text-sm">Almuerzo</span>
                                </div>
                                ${measurements.insulinLunch ? `<span class="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium text-xs">${measurements.insulinLunch}u</span>` : ''}
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                ${measurements.beforeLunch ? `
                                    <div class="bg-white p-2 rounded border text-center">
                                        <div class="text-yellow-600 font-medium text-xs">Antes</div>
                                        <div class="text-sm font-bold ${measurements.beforeLunch > targetRanges.beforeMeal ? 'text-red-600' : 'text-yellow-800'}">${measurements.beforeLunch} mg/dL</div>
                                    </div>
                                ` : ''}
                                ${measurements.afterLunch ? `
                                    <div class="bg-white p-2 rounded border text-center">
                                        <div class="text-yellow-600 font-medium text-xs">Después</div>
                                        <div class="text-sm font-bold ${measurements.afterLunch > targetRanges.afterMeal ? 'text-red-600' : 'text-yellow-800'}">${measurements.afterLunch} mg/dL</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    ${measurements.beforeDinner || measurements.afterDinner || measurements.insulinDinner ? `
                        <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-2 rounded-lg border border-purple-200">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm">🌙</span>
                                    <span class="font-semibold text-purple-800 text-sm">Cena</span>
                                </div>
                                ${measurements.insulinDinner ? `<span class="bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-medium text-xs">${measurements.insulinDinner}u</span>` : ''}
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                ${measurements.beforeDinner ? `
                                    <div class="bg-white p-2 rounded border text-center">
                                        <div class="text-purple-600 font-medium text-xs">Antes</div>
                                        <div class="text-sm font-bold ${measurements.beforeDinner > targetRanges.beforeMeal ? 'text-red-600' : 'text-purple-800'}">${measurements.beforeDinner} mg/dL</div>
                                    </div>
                                ` : ''}
                                ${measurements.afterDinner ? `
                                    <div class="bg-white p-2 rounded border text-center">
                                        <div class="text-purple-600 font-medium text-xs">Después</div>
                                        <div class="text-sm font-bold ${measurements.afterDinner > targetRanges.afterMeal ? 'text-red-600' : 'text-purple-800'}">${measurements.afterDinner} mg/dL</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    historyListContainer.innerHTML = listHTML;
}

export async function deleteHistoryRecord(recordId) {
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
        await deleteRecord(recordId);
        const history = await getHistory();
        if (history.length > 0) {
            displayHistorySummary(history);
            displayHistoryList(history);
        } else {
            displayHistory();
        }
        showAlert('Registro eliminado correctamente.', 'success');
    }
}

export async function exportHistory() {
    const history = await getHistory();
    if (history.length === 0) {
        showAlert('No hay datos para exportar.', 'warning');
        return;
    }
    const csvHeaders = [
        'Fecha', 'Hora', 'Antes Desayuno', 'Después Desayuno', 'Insulina Desayuno',
        'Antes Almuerzo', 'Después Almuerzo', 'Insulina Almuerzo',
        'Antes Cena', 'Después Cena', 'Insulina Cena',
        'Promedio Glucosa', 'Total Insulina', '% Resultados Malos', 'Alertas'
    ];
    const csvRows = history.map(record => [
        record.date,
        record.time,
        record.measurements.beforeBreakfast,
        record.measurements.afterBreakfast,
        record.measurements.insulinBreakfast,
        record.measurements.beforeLunch,
        record.measurements.afterLunch,
        record.measurements.insulinLunch,
        record.measurements.beforeDinner,
        record.measurements.afterDinner,
        record.measurements.insulinDinner,
        record.statistics.averageGlucose,
        record.statistics.totalInsulin,
        record.statistics.badPercentage,
        record.alertsCount
    ]);
    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `glucometro_historial_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showAlert('Historial exportado correctamente.', 'success');
}

export async function clearHistory() {
    if (confirm('¿Está seguro de que desea eliminar TODO el historial? Esta acción no se puede deshacer.')) {
        await clearStorageHistory();
        displayHistory();
        showAlert('Historial eliminado completamente.', 'success');
    }
}

export function updateNotificationStatus() {
    const browserSupport = 'Notification' in window;
    const hasPermission = browserSupport && Notification.permission === 'granted';
    const savedEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    const isRunning = notificationScheduler.checkInterval !== null;
    const isActive = hasPermission && savedEnabled && isRunning;
    const statusElement = document.getElementById('notificationStatus');
    if (statusElement) {
        let statusText = '🔕 Inactivas';
        let statusClass = 'text-gray-600';
        let buttonText = 'Activar';
        let buttonClass = 'bg-green-100 text-green-600 hover:bg-green-200';
        let buttonAction = 'enableNotifications()';
        if (!browserSupport) {
            statusText = '❌ No soportadas';
            statusClass = 'text-red-600';
            buttonText = 'No disponible';
            buttonClass = 'bg-gray-100 text-gray-500 cursor-not-allowed';
            buttonAction = '';
        } else if (Notification.permission === 'denied') {
            statusText = '🚫 Bloqueadas';
            statusClass = 'text-red-600';
            buttonText = 'Bloqueadas';
            buttonClass = 'bg-red-100 text-red-600 cursor-not-allowed';
            buttonAction = '';
        } else if (isActive) {
            statusText = '🔔 Activas';
            statusClass = 'text-green-600';
            buttonText = 'Desactivar';
            buttonClass = 'bg-red-100 text-red-600 hover:bg-red-200';
            buttonAction = 'disableNotifications()';
        }
        statusElement.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-sm ${statusClass}">
                    ${statusText}
                </span>
                <button ${buttonAction ? `onclick="${buttonAction}"` : 'disabled'}
                        class="px-2 py-1 text-xs rounded ${buttonClass}">
                    ${buttonText}
                </button>
            </div>
            ${!browserSupport ? '<div class="text-xs text-gray-500 mt-1">Tu navegador no soporta notificaciones</div>' : ''}
            ${Notification.permission === 'denied' ? '<div class="text-xs text-red-500 mt-1">Permisos denegados en configuración del navegador</div>' : ''}
        `;
    }
}
