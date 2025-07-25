// Referencias a elementos del DOM
const form = document.getElementById('glucoseForm');
const clearBtn = document.getElementById('clearBtn');
const historyBtn = document.getElementById('historyBtn');
const saveBreakfastBtn = document.getElementById('saveBreakfastBtn');
const saveLunchBtn = document.getElementById('saveLunchBtn');
const saveDinnerBtn = document.getElementById('saveDinnerBtn');
const resultsSection = document.getElementById('results');
const historySection = document.getElementById('historySection');
const alertsContainer = document.getElementById('alerts');
const statisticsContainer = document.getElementById('statistics');
const recommendationsContainer = document.getElementById('recommendations');
const historySummaryContainer = document.getElementById('historySummary');
const historyListContainer = document.getElementById('historyList');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Clave para localStorage
const STORAGE_KEY = 'glucometro_history';

// Event listeners se registran en DOMContentLoaded

// Tab navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.id.replace('Tab', 'Content');
        
        // Remove active class from all tabs and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        // Load history when history tab is clicked
        if (tabId === 'historyContent') {
            displayHistory();
        }
    });
});

// Configuración de rangos objetivo
let targetRanges = {
    beforeMeal: 95,
    afterMeal: 145
};

// Cargar rangos guardados al iniciar
function loadTargetRanges() {
    const saved = localStorage.getItem('glucoseTargetRanges');
    if (saved) {
        targetRanges = JSON.parse(saved);
        document.getElementById('beforeMealTarget').value = targetRanges.beforeMeal;
        document.getElementById('afterMealTarget').value = targetRanges.afterMeal;
    }
}

// Guardar rangos objetivo
function saveTargetRanges() {
    const beforeMeal = parseInt(document.getElementById('beforeMealTarget').value);
    const afterMeal = parseInt(document.getElementById('afterMealTarget').value);
    
    if (beforeMeal < 50 || beforeMeal > 200) {
        alert('El rango antes de comidas debe estar entre 50 y 200 mg/dL');
        return;
    }
    
    if (afterMeal < 100 || afterMeal > 300) {
        alert('El rango después de comidas debe estar entre 100 y 300 mg/dL');
        return;
    }
    
    targetRanges.beforeMeal = beforeMeal;
    targetRanges.afterMeal = afterMeal;
    
    localStorage.setItem('glucoseTargetRanges', JSON.stringify(targetRanges));
    
    // Mostrar confirmación
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

// Función principal para manejar el envío del formulario
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Obtener datos del formulario
    const formData = getFormData();
    
    // Validar datos
    if (!validateData(formData)) {
        return;
    }
    
    // Analizar resultados
    const analysis = analyzeGlucoseData(formData);
    
    // Guardar en historial
    saveToHistory(formData, analysis);
    
    // Mostrar resultados
    displayResults(analysis);
    
    // Mostrar la sección de resultados
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Obtener datos del formulario
function getFormData() {
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

// Validar datos del formulario
function validateData(data) {
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

// Analizar datos de glucosa
function analyzeGlucoseData(data) {
    const measurements = [
        { name: 'Antes del Desayuno', value: data.beforeBreakfast, type: 'before', meal: 'desayuno' },
        { name: '1h Después del Desayuno', value: data.afterBreakfast, type: 'after', meal: 'desayuno' },
        { name: 'Antes del Almuerzo', value: data.beforeLunch, type: 'before', meal: 'almuerzo' },
        { name: '1h Después del Almuerzo', value: data.afterLunch, type: 'after', meal: 'almuerzo' },
        { name: 'Antes de la Cena', value: data.beforeDinner, type: 'before', meal: 'cena' },
        { name: '1h Después de la Cena', value: data.afterDinner, type: 'after', meal: 'cena' }
    ];
    
    const alerts = [];
    let goodReadings = 0;
    let badReadings = 0;
    
    // Analizar cada medición
    measurements.forEach(measurement => {
        const limit = measurement.type === 'before' ? targetRanges.beforeMeal : targetRanges.afterMeal;
        const isHigh = measurement.value > limit;
        
        if (isHigh) {
            badReadings++;
            alerts.push({
                type: 'danger',
                message: `⚠️ ALERTA: ${measurement.name} - ${measurement.value} mg/dL (Límite: ${limit} mg/dL)`,
                detail: `Se superó el nivel recomendado ${measurement.type === 'before' ? 'antes' : 'después'} de la ${measurement.meal}.`
            });
        } else {
            goodReadings++;
        }
    });
    
    // Calcular estadísticas
    const totalReadings = measurements.length;
    const badPercentage = Math.round((badReadings / totalReadings) * 100);
    const goodPercentage = Math.round((goodReadings / totalReadings) * 100);
    
    // Calcular promedio de glucosa
    const averageGlucose = Math.round(measurements.reduce((sum, m) => sum + m.value, 0) / totalReadings);
    
    // Calcular insulina total
    const totalInsulin = data.insulinBreakfast + data.insulinLunch + data.insulinDinner;
    
    return {
        alerts,
        statistics: {
            totalReadings,
            goodReadings,
            badReadings,
            goodPercentage,
            badPercentage,
            averageGlucose,
            totalInsulin
        },
        measurements,
        insulinData: {
            breakfast: data.insulinBreakfast,
            lunch: data.insulinLunch,
            dinner: data.insulinDinner,
            total: totalInsulin
        }
    };
}

// Mostrar resultados
function displayResults(analysis) {
    // Limpiar contenedores
    alertsContainer.innerHTML = '';
    statisticsContainer.innerHTML = '';
    recommendationsContainer.innerHTML = '';
    
    // Mostrar alertas
    displayAlerts(analysis.alerts, analysis.statistics);
    
    // Mostrar estadísticas
    displayStatistics(analysis.statistics);
    
    // Mostrar recomendaciones
    displayRecommendations(analysis);
}

// Mostrar alertas
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
        
        // Agregar resumen de alertas
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

// Mostrar estadísticas
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
    `;
}

// Mostrar recomendaciones
function displayRecommendations(analysis) {
    const recommendations = generateRecommendations(analysis);
    
    let recommendationsHTML = '<div class="bg-white p-6 rounded-xl border-2 border-gray-200"><h3 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2"><span>💡</span> Recomendaciones Personalizadas</h3><ul class="space-y-3">';
    
    recommendations.forEach(rec => {
        recommendationsHTML += `<li class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"><span class="text-xl flex-shrink-0">${rec.icon}</span><span class="text-gray-700">${rec.text}</span></li>`;
    });
    
    recommendationsHTML += '</ul></div>';
    recommendationsContainer.innerHTML = recommendationsHTML;
}

// Generar recomendaciones basadas en el análisis
function generateRecommendations(analysis) {
    const recommendations = [];
    const { statistics, measurements, insulinData } = analysis;
    
    // Recomendaciones basadas en el porcentaje de resultados malos
    if (statistics.badPercentage === 0) {
        recommendations.push({
            icon: '🎉',
            text: 'Excelente control glucémico. Continúe con su rutina actual.'
        });
    } else if (statistics.badPercentage <= 30) {
        recommendations.push({
            icon: '👍',
            text: 'Buen control general. Revise los momentos con lecturas elevadas.'
        });
    } else if (statistics.badPercentage <= 50) {
        recommendations.push({
            icon: '⚠️',
            text: 'Control moderado. Considere ajustar su plan de alimentación y medicación.'
        });
    } else {
        recommendations.push({
            icon: '🚨',
            text: 'Control deficiente. Consulte urgentemente con su médico endocrinólogo.'
        });
    }
    
    // Recomendaciones específicas por horario
    const beforeMeals = measurements.filter(m => m.type === 'before');
    const afterMeals = measurements.filter(m => m.type === 'after');
    
    const highBeforeMeals = beforeMeals.filter(m => m.value > targetRanges.beforeMeal);
    const highAfterMeals = afterMeals.filter(m => m.value > targetRanges.afterMeal);
    
    if (highBeforeMeals.length > 0) {
        recommendations.push({
            icon: '🍽️',
            text: 'Lecturas elevadas antes de las comidas. Revise su medicación basal o de acción prolongada.'
        });
    }
    
    if (highAfterMeals.length > 0) {
        recommendations.push({
            icon: '⏰',
            text: 'Lecturas elevadas después de las comidas. Considere ajustar las dosis de insulina rápida o la composición de las comidas.'
        });
    }
    
    // Recomendaciones sobre insulina
    if (insulinData.total === 0) {
        recommendations.push({
            icon: '💉',
            text: 'No se registró uso de insulina. Si está prescrita, asegúrese de aplicarla según indicaciones médicas.'
        });
    }
    
    // Recomendaciones generales
    recommendations.push({
        icon: '📊',
        text: 'Mantenga un registro diario para identificar patrones y tendencias.'
    });
    
    recommendations.push({
        icon: '🏃‍♂️',
        text: 'El ejercicio regular ayuda a mejorar el control glucémico.'
    });
    
    if (statistics.averageGlucose > 140) {
        recommendations.push({
            icon: '🥗',
            text: 'Considere revisar su plan alimentario con un nutricionista especializado en diabetes.'
        });
    }
    
    return recommendations;
}

// Mostrar alerta temporal
function showAlert(message, type = 'warning') {
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
    
    alertDiv.className = `${alertClass} p-4 rounded-xl mb-4 border-2 flex items-center gap-3 animate-fade-in`;
    alertDiv.innerHTML = `<span class="text-xl">${icon}</span> <div>${message}</div>`;
    
    // Insertar al inicio del contenedor de alertas
    alertsContainer.insertBefore(alertDiv, alertsContainer.firstChild);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Limpiar formulario
function clearForm() {
    if (confirm('¿Está seguro de que desea limpiar todos los datos?')) {
        form.reset();
        resultsSection.style.display = 'none';
        
        // Enfocar el primer campo
        document.getElementById('beforeBreakfast').focus();
        
        showAlert('Formulario limpiado correctamente.', 'success');
    }
}

// Función para formatear números
function formatNumber(num, decimals = 1) {
    return Number(num).toFixed(decimals);
}

// Funciones para el selector de fecha
function initializeDateSelector() {
    const dateInput = document.getElementById('recordDate');
    const timeInput = document.getElementById('recordTime');
    const todayBtn = document.getElementById('todayBtn');
    const editCheckbox = document.getElementById('enableEditMode');
    
    // Establecer fecha y hora actual por defecto
    const now = new Date();
    dateInput.value = now.toISOString().split('T')[0];
    timeInput.value = now.toTimeString().slice(0, 5);
    
    // Establecer fecha máxima como hoy
    dateInput.max = now.toISOString().split('T')[0];
    
    // Cargar datos existentes para la fecha actual
    loadDataForSelectedDate();
    
    // Event listener para cambio de fecha
    dateInput.addEventListener('change', function() {
        loadDataForSelectedDate();
    });
    
    // Botón "Hoy" para establecer fecha y hora actual
    todayBtn.addEventListener('click', function() {
        const current = new Date();
        dateInput.value = current.toISOString().split('T')[0];
        timeInput.value = current.toTimeString().slice(0, 5);
        
        // Limpiar campos y habilitar edición para fecha actual
        clearFormFields();
        enableAllFields();
        
        showAlert('Fecha establecida a hoy. Puede ingresar nuevos datos.', 'info');
        
        // Mostrar confirmación visual
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
    
    // Manejar casilla de edición
    if (editCheckbox) {
        editCheckbox.addEventListener('change', function() {
            if (this.checked) {
                enableAllFields();
                showAlert('Modo de edición activado. Puede modificar los datos.', 'success');
            } else {
                // Solo deshabilitar si hay datos cargados y no es fecha actual
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

// Cargar datos existentes para la fecha seleccionada
function loadDataForSelectedDate() {
    const dateInput = document.getElementById('recordDate');
    if (!dateInput.value) {
        enableAllFields();
        return;
    }
    
    const selectedDate = new Date(dateInput.value).toLocaleDateString('es-ES');
    const history = getHistory();
    
    // Buscar registros para la fecha seleccionada
    const recordsForDate = history.filter(record => record.date === selectedDate);
    
    // Limpiar formulario primero
    clearFormFields();
    
    if (recordsForDate.length === 0) {
        enableAllFields();
        showAlert(`No se encontraron registros para ${selectedDate}`, 'info');
        return;
    }
    
    // Buscar registro completo primero
    let completeRecord = recordsForDate.find(record => record.type === 'complete');
    
    if (completeRecord) {
        // Cargar datos del registro completo
        loadCompleteRecord(completeRecord);
        disableAllFields();
        showAlert(`Datos cargados para ${selectedDate}. Use la casilla de edición para modificar.`, 'success');
    } else {
        // Cargar registros individuales de comidas
        loadMealRecords(recordsForDate, selectedDate);
        disableAllFields();
        showAlert(`Datos parciales cargados para ${selectedDate}. Use la casilla de edición para modificar.`, 'info');
    }
}

// Limpiar campos del formulario
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

// Deshabilitar todos los campos del formulario
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
    
    // Deshabilitar botones de guardar comidas
    const mealButtons = ['saveBreakfastBtn', 'saveLunchBtn', 'saveDinnerBtn'];
    mealButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    
    // Deshabilitar botón de envío del formulario
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// Habilitar todos los campos del formulario
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
    
    // Habilitar botones de guardar comidas
    const mealButtons = ['saveBreakfastBtn', 'saveLunchBtn', 'saveDinnerBtn'];
    mealButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
    
    // Habilitar botón de envío del formulario
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // Desmarcar la casilla de edición
    const editCheckbox = document.getElementById('enableEditMode');
    if (editCheckbox) {
        editCheckbox.checked = false;
    }
}

// Cargar registro completo
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

// Cargar registros individuales de comidas
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

// Obtener fecha y hora seleccionadas
function getSelectedDateTime() {
    const dateInput = document.getElementById('recordDate');
    const timeInput = document.getElementById('recordTime');
    
    if (!dateInput.value || !timeInput.value) {
        // Si no hay fecha/hora seleccionada, usar actual
        const now = new Date();
        return {
            date: now.toLocaleDateString('es-ES'),
            time: now.toLocaleTimeString('es-ES'),
            timestamp: now.toISOString(),
            dateObject: now
        };
    }
    
    // Crear objeto Date con la fecha y hora seleccionadas
    const selectedDate = new Date(dateInput.value + 'T' + timeInput.value);
    
    return {
        date: selectedDate.toLocaleDateString('es-ES'),
        time: selectedDate.toLocaleTimeString('es-ES'),
        timestamp: selectedDate.toISOString(),
        dateObject: selectedDate
    };
}

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registrado exitosamente:', registration.scope);
                
                // Mostrar banner de instalación si está disponible
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                    console.log('PWA: Evento beforeinstallprompt disparado');
                    e.preventDefault();
                    deferredPrompt = e;
                    showInstallBanner(deferredPrompt);
                });
                
                // Detectar cuando la app fue instalada
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

// Función para mostrar banner de instalación
function showInstallBanner(deferredPrompt) {
    // Crear banner de instalación si no existe
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
        
        // Ajustar padding del body para compensar el banner
        document.body.style.paddingTop = '60px';
        
        // Event listeners para los botones
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

// Función para ocultar banner de instalación
function hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.remove();
        document.body.style.paddingTop = '0';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar selector de fecha
    initializeDateSelector();
    
    // Inicializar filtros del historial
    initializeHistoryFilters();
    
    // Registrar todos los event listeners
    form.addEventListener('submit', handleFormSubmit);
    clearBtn.addEventListener('click', clearForm);
    saveBreakfastBtn.addEventListener('click', () => saveMealData('breakfast'));
    saveLunchBtn.addEventListener('click', () => saveMealData('lunch'));
    saveDinnerBtn.addEventListener('click', () => saveMealData('dinner'));
    exportHistoryBtn.addEventListener('click', exportHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    document.getElementById('saveTargetsBtn').addEventListener('click', saveTargetRanges);
    
    // Enfocar el primer campo al cargar la página
    document.getElementById('beforeBreakfast').focus();
    
    // Cargar rangos objetivo guardados
    loadTargetRanges();
    
    // Configurar estado inicial de notificaciones
    updateNotificationStatus();
    
    // Auto-iniciar notificaciones si ya están habilitadas
    if (localStorage.getItem('notificationsEnabled') === 'true') {
        notificationScheduler.notificationsEnabled = true;
        notificationScheduler.start();
        updateNotificationStatus();
    }
    
    // Delegación de eventos para botones de eliminar del historial
    if (historyListContainer) {
        historyListContainer.addEventListener('click', function(e) {
            // Verificar si el click fue en un botón de eliminar o en el emoji dentro del botón
            const deleteBtn = e.target.closest('.delete-record-btn');
            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                deleteHistoryRecord(index);
            }
        });
    }
    
    // Agregar validación en tiempo real
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (this.name.includes('insulin')) {
                // Validación para insulina
                if (value < 0) this.value = 0;
                if (value > 100) this.value = 100;
            } else {
                // Validación para glucosa
                if (value < 50 || value > 500) {
                    this.classList.remove('border-gray-300', 'focus:border-blue-400');
                    this.classList.add('border-red-400', 'focus:border-red-500');
                } else {
                    this.classList.remove('border-red-400', 'focus:border-red-500');
                    this.classList.add('border-gray-300', 'focus:border-blue-400');
                }
            }
        });
    });
});

// Función para exportar datos (funcionalidad adicional)
function exportData() {
    const formData = getFormData();
    const analysis = analyzeGlucoseData(formData);
    
    const exportData = {
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString('es-ES'),
        mediciones: formData,
        estadisticas: analysis.statistics,
        alertas: analysis.alerts.length
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `glucometro_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// ===== FUNCIONES DE HISTORIAL =====

// Guardar registro completo en el historial
function saveToHistory(formData, analysis) {
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
    
    const history = getHistory();
    
    // Verificar si ya existe un registro para esta fecha y hora exacta
    const existingIndex = history.findIndex(h => h.timestamp === record.timestamp && h.type === 'complete');
    if (existingIndex !== -1) {
        // Actualizar registro existente
        history[existingIndex] = record;
        showAlert('Registro actualizado para la fecha y hora seleccionada.', 'success');
    } else {
        // Agregar nuevo registro
        history.unshift(record);
        showAlert('Registro guardado para la fecha y hora seleccionada.', 'success');
    }
    
    // Ordenar historial por timestamp (más reciente primero)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (history.length > 100) {
        history.splice(100);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// Guardar datos de una comida específica
function saveMealData(mealType) {
    const formData = getFormData();
    let mealData = {};
    let isValid = false;
    
    switch(mealType) {
        case 'breakfast':
            if (formData.beforeBreakfast && formData.afterBreakfast && formData.insulinBreakfast) {
                mealData = {
                    beforeBreakfast: formData.beforeBreakfast,
                    afterBreakfast: formData.afterBreakfast,
                    insulinBreakfast: formData.insulinBreakfast
                };
                isValid = true;
            }
            break;
        case 'lunch':
            if (formData.beforeLunch && formData.afterLunch && formData.insulinLunch) {
                mealData = {
                    beforeLunch: formData.beforeLunch,
                    afterLunch: formData.afterLunch,
                    insulinLunch: formData.insulinLunch
                };
                isValid = true;
            }
            break;
        case 'dinner':
            if (formData.beforeDinner && formData.afterDinner && formData.insulinDinner) {
                mealData = {
                    beforeDinner: formData.beforeDinner,
                    afterDinner: formData.afterDinner,
                    insulinDinner: formData.insulinDinner
                };
                isValid = true;
            }
            break;
    }
    
    if (!isValid) {
        showAlert(`Por favor complete todos los campos de ${getMealName(mealType)} antes de guardar.`, 'warning');
        return;
    }
    
    // Analizar solo los datos de esta comida
    const mealAnalysis = analyzeMealData(mealData, mealType);
    
    const selectedDateTime = getSelectedDateTime();
    
    const record = {
        id: selectedDateTime.dateObject.getTime() + Math.random(), // Agregar random para evitar conflictos entre comidas
        date: selectedDateTime.date,
        time: selectedDateTime.time,
        timestamp: selectedDateTime.timestamp,
        measurements: mealData,
        mealType: mealType,
        statistics: mealAnalysis.statistics,
        alertsCount: mealAnalysis.alerts.length,
        hasHighReadings: mealAnalysis.alerts.length > 0,
        type: 'meal'
    };
    
    const history = getHistory();
    
    // Verificar si ya existe un registro de esta comida para esta fecha
    const existingIndex = history.findIndex(h => 
        h.date === record.date && 
        h.mealType === mealType && 
        h.type === 'meal'
    );
    
    if (existingIndex !== -1) {
        // Actualizar registro existente de la comida
        history[existingIndex] = record;
        showAlert(`${getMealName(mealType)} actualizado para la fecha seleccionada.`, 'success');
    } else {
        // Agregar nuevo registro de comida
        history.unshift(record);
        showAlert(`${getMealName(mealType)} guardado para la fecha seleccionada.`, 'success');
    }
    
    // Ordenar historial por timestamp (más reciente primero)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (history.length > 100) {
        history.splice(100);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    // Mostrar resultados de la comida
    displayMealResults(mealAnalysis, mealType);
}

// Obtener nombre de comida en español
function getMealName(mealType) {
    const names = {
        breakfast: 'Desayuno',
        lunch: 'Almuerzo', 
        dinner: 'Cena'
    };
    return names[mealType] || mealType;
}

// Analizar datos de una comida específica
function analyzeMealData(mealData, mealType) {
    const alerts = [];
    let beforeValue, afterValue, insulinValue;
    
    switch(mealType) {
        case 'breakfast':
            beforeValue = mealData.beforeBreakfast;
            afterValue = mealData.afterBreakfast;
            insulinValue = mealData.insulinBreakfast;
            break;
        case 'lunch':
            beforeValue = mealData.beforeLunch;
            afterValue = mealData.afterLunch;
            insulinValue = mealData.insulinLunch;
            break;
        case 'dinner':
            beforeValue = mealData.beforeDinner;
            afterValue = mealData.afterDinner;
            insulinValue = mealData.insulinDinner;
            break;
    }
    
    // Verificar alertas
    if (beforeValue > targetRanges.beforeMeal) {
        alerts.push({
            type: 'high',
            meal: getMealName(mealType),
            timing: 'antes',
            value: beforeValue,
            limit: targetRanges.beforeMeal
        });
    }
    
    if (afterValue > targetRanges.afterMeal) {
        alerts.push({
            type: 'high',
            meal: getMealName(mealType),
            timing: 'después',
            value: afterValue,
            limit: targetRanges.afterMeal
        });
    }
    
    const statistics = {
        averageGlucose: Math.round((beforeValue + afterValue) / 2),
        totalInsulin: insulinValue,
        badReadings: alerts.length,
        goodReadings: 2 - alerts.length,
        badPercentage: Math.round((alerts.length / 2) * 100)
    };
    
    return { alerts, statistics };
}

// Mostrar resultados de una comida
function displayMealResults(analysis, mealType) {
    const mealName = getMealName(mealType);
    
    // Mostrar alertas si las hay
    if (analysis.alerts.length > 0) {
        let alertsHTML = `<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">`;
        alertsHTML += `<h3 class="text-lg font-bold text-red-800 mb-3">⚠️ Alertas de ${mealName}</h3>`;
        
        analysis.alerts.forEach(alert => {
            alertsHTML += `
                <div class="bg-red-100 border border-red-300 rounded-lg p-3 mb-2">
                    <div class="font-semibold text-red-800">
                        Glucosa ${alert.timing} de ${alert.meal}: ${alert.value} mg/dL
                    </div>
                    <div class="text-sm text-red-600">
                        Excede el límite recomendado de ${alert.limit} mg/dL
                    </div>
                </div>
            `;
        });
        
        alertsHTML += `</div>`;
        alertsContainer.innerHTML = alertsHTML;
    } else {
        alertsContainer.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 class="text-lg font-bold text-green-800 mb-2">✅ ${mealName} - Resultados Normales</h3>
                <p class="text-green-700">Todos los valores de glucosa están dentro de los rangos recomendados.</p>
            </div>
        `;
    }
    
    // Mostrar estadísticas de la comida
    const badPercentage = Math.round((analysis.statistics.badReadings / 2) * 100);
    statisticsContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                <div class="text-xl font-bold text-red-600">${badPercentage}%</div>
                <div class="text-xs text-red-800 font-medium">Dañinos</div>
            </div>
            <div class="bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
                <div class="text-xl font-bold text-purple-600">${analysis.statistics.totalInsulin}</div>
                <div class="text-xs text-purple-800 font-medium">Insulina</div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div class="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                <div class="text-xl font-bold text-green-600">${analysis.statistics.goodReadings}</div>
                <div class="text-xs text-green-800 font-medium">Normales</div>
            </div>
            <div class="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                <div class="text-xl font-bold text-red-600">${analysis.statistics.badReadings}</div>
                <div class="text-xs text-red-800 font-medium">Altas</div>
            </div>
        </div>
    `;
    
    // Mostrar recomendaciones específicas para la comida
    const recommendations = generateMealRecommendations(analysis, mealType);
    recommendationsContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-lg font-bold text-blue-800 mb-3">💡 Recomendaciones para ${mealName}</h3>
            <ul class="space-y-2">
                ${recommendations.map(rec => `<li class="flex items-start gap-2 text-blue-700"><span class="text-blue-500 mt-1">•</span><span>${rec}</span></li>`).join('')}
            </ul>
        </div>
    `;
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Generar recomendaciones específicas para una comida
function generateMealRecommendations(analysis, mealType) {
    const recommendations = [];
    const mealName = getMealName(mealType);
    
    if (analysis.alerts.length === 0) {
        recommendations.push(`Excelente control en ${mealName.toLowerCase()}. Continúe con este patrón.`);
        recommendations.push('Mantenga la misma dosis de insulina y tipo de alimentos.');
    } else {
        analysis.alerts.forEach(alert => {
            if (alert.timing === 'antes') {
                recommendations.push(`Considere ajustar la insulina de acción prolongada o revisar la cena anterior.`);
                recommendations.push('Evite carbohidratos simples en la comida previa.');
            } else {
                recommendations.push(`Revise la cantidad de carbohidratos en ${mealName.toLowerCase()}.`);
                recommendations.push('Considere aumentar la dosis de insulina rápida para esta comida.');
            }
        });
    }
    
    // Recomendaciones específicas por horario
    const timeRecommendations = {
        breakfast: ['Prefiera avena, frutas y proteínas magras.', 'Evite jugos y cereales azucarados.'],
        lunch: ['Incluya vegetales, proteína y carbohidratos complejos.', 'Controle las porciones de arroz o pasta.'],
        dinner: ['Cene temprano y ligero.', 'Prefiera vegetales y proteínas, limite carbohidratos.']
    };
    
    recommendations.push(...timeRecommendations[mealType]);
    
    return recommendations;
}

// Obtener historial del localStorage
function getHistory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Mostrar historial en la pestaña
function displayHistory() {
    const history = getHistory();
    
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
    
    // Aplicar filtros
    const filteredHistory = applyHistoryFilters(history);
    
    // Verificar si hay registros después del filtrado
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

// Aplicar filtros al historial
function applyHistoryFilters(history) {
    const filterDateFrom = document.getElementById('filterDateFrom')?.value;
    const filterDateTo = document.getElementById('filterDateTo')?.value;
    const filterRecordType = document.getElementById('filterRecordType')?.value || 'all';
    
    let filtered = [...history];
    
    // Filtrar por fecha desde
    if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        filtered = filtered.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= fromDate;
        });
    }
    
    // Filtrar por fecha hasta
    if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // Incluir todo el día
        filtered = filtered.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate <= toDate;
        });
    }
    
    // Filtrar por tipo de registro
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
        // 'all' no requiere filtrado adicional
    }
    
    return filtered;
}

// Limpiar filtros del historial
function clearHistoryFilters() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterRecordType').value = 'all';
    
    // Actualizar la vista del historial
    displayHistory();
    
    showAlert('Filtros limpiados correctamente.', 'info');
}

// Inicializar filtros del historial
function initializeHistoryFilters() {
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



// Mostrar resumen del historial
function displayHistorySummary(history) {
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
    
    const allReadings = [];
    let totalInsulin = 0;
    let alertsCount = 0;
    
    history.forEach(record => {
        if (record.measurements.beforeBreakfast) allReadings.push(record.measurements.beforeBreakfast);
        if (record.measurements.afterBreakfast) allReadings.push(record.measurements.afterBreakfast);
        if (record.measurements.beforeLunch) allReadings.push(record.measurements.beforeLunch);
        if (record.measurements.afterLunch) allReadings.push(record.measurements.afterLunch);
        if (record.measurements.beforeDinner) allReadings.push(record.measurements.beforeDinner);
        if (record.measurements.afterDinner) allReadings.push(record.measurements.afterDinner);
        
        // Sumar insulina total
        totalInsulin += (record.measurements.insulinBreakfast || 0);
        totalInsulin += (record.measurements.insulinLunch || 0);
        totalInsulin += (record.measurements.insulinDinner || 0);
        
        // Contar alertas
        alertsCount += (record.alertsCount || 0);
    });
    
    const averageGlucose = allReadings.length > 0 ? 
        (allReadings.reduce((sum, reading) => sum + reading, 0) / allReadings.length).toFixed(1) : 0;
    
    // Calcular lecturas malas usando los rangos configurables
    const badReadings = allReadings.filter((reading, index) => {
        // Determinar si es antes o después de comida basado en el patrón
        // beforeBreakfast, afterBreakfast, beforeLunch, afterLunch, beforeDinner, afterDinner
        const isBeforeMeal = index % 2 === 0;
        const limit = isBeforeMeal ? targetRanges.beforeMeal : targetRanges.afterMeal;
        return reading > limit;
    }).length;
    
    const averageBadPercentage = allReadings.length > 0 ? 
        ((badReadings / allReadings.length) * 100).toFixed(1) : '0';
    
    // Calcular rango de fechas
    const dates = history.map(record => new Date(record.timestamp)).sort((a, b) => a - b);
    const firstDate = dates[0]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) || 'N/A';
    const lastDate = dates[dates.length - 1]?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) || 'N/A';
    
    // Calcular días únicos
    const uniqueDays = new Set(history.map(record => record.date)).size;
    
    historySummaryContainer.innerHTML = `
        <!-- Título del resumen -->
        <div class="col-span-2 mb-3">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                    📊 Resumen General
                </h3>
                <span class="text-xs text-gray-500">${firstDate} - ${lastDate}</span>
            </div>
        </div>
        
        <!-- Estadísticas principales -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-blue-800">${uniqueDays}</div>
            <div class="text-xs text-blue-600 font-medium">Días registrados</div>
            <div class="text-xs text-blue-500 mt-1">${totalRecords} entradas</div>
        </div>
        
        <div class="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-green-800">${totalReadings}</div>
            <div class="text-xs text-green-600 font-medium">Mediciones</div>
            <div class="text-xs text-green-500 mt-1">${(totalReadings / uniqueDays).toFixed(1)} por día</div>
        </div>
        
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-purple-800">${averageGlucose}</div>
            <div class="text-xs text-purple-600 font-medium">Promedio glucosa</div>
            <div class="text-xs text-purple-500 mt-1">mg/dL</div>
        </div>
        
        <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200 text-center hover:shadow-md transition-shadow duration-200">
            <div class="text-xl font-bold text-orange-800">${totalInsulin}</div>
            <div class="text-xs text-orange-600 font-medium">Insulina total</div>
            <div class="text-xs text-orange-500 mt-1">unidades</div>
        </div>
        
        <!-- Indicadores de salud -->
        <div class="col-span-2 grid grid-cols-2 gap-2 mt-2">
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
    `;
}

// Mostrar lista de registros del historial
function displayHistoryList(history) {
    if (history.length === 0) {
        historyListContainer.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No hay registros guardados</div>';
        return;
    }
    
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
        
        // Calcular total de insulina
        const totalInsulin = (measurements.insulinBreakfast || 0) + 
                            (measurements.insulinLunch || 0) + 
                            (measurements.insulinDinner || 0);
        
        // Determinar el tipo de registro
        const recordType = record.type === 'complete' ? 'Completo' : 
                          record.mealType ? getMealName(record.mealType) : 'Parcial';
        
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-3 mb-3 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                <!-- Header del registro -->
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
                
                <!-- Mediciones por comida -->
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

// Eliminar un registro específico
function deleteHistoryRecord(recordIndex) {
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
        const history = getHistory();
        history.splice(recordIndex, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        
        // Actualizar la vista
        if (history.length > 0) {
            displayHistorySummary(history);
            displayHistoryList(history);
        } else {
            displayHistory();
        }
        
        showAlert('Registro eliminado correctamente.', 'success');
    }
}

// Exportar historial
function exportHistory() {
    const history = getHistory();
    
    if (history.length === 0) {
        showAlert('No hay datos para exportar.', 'warning');
        return;
    }
    
    // Crear CSV
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
    
    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `glucometro_historial_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showAlert('Historial exportado correctamente.', 'success');
}

// Limpiar todo el historial
function clearHistory() {
    if (confirm('¿Está seguro de que desea eliminar TODO el historial? Esta acción no se puede deshacer.')) {
        localStorage.removeItem(STORAGE_KEY);
        displayHistory(); // Actualizar la vista del historial
        showAlert('Historial eliminado completamente.', 'success');
    }
}

// Hacer la función deleteHistoryRecord accesible globalmente
window.deleteHistoryRecord = deleteHistoryRecord;

// Sistema de notificaciones programadas
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
        this.notificationsEnabled = false;
        this.checkInterval = null;
        this.lastNotificationDate = {};
    }

    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationsEnabled = permission === 'granted';
            return this.notificationsEnabled;
        }
        return false;
    }

    showNotification(title, message) {
        if (this.notificationsEnabled && 'Notification' in window) {
            new Notification(title, {
                body: message,
                icon: '🩺',
                badge: '🩺',
                tag: 'glucose-reminder',
                requireInteraction: true
            });
        }
        
        // También mostrar alerta en la aplicación
        this.showInAppAlert(message);
    }

    showInAppAlert(message) {
        // Crear una alerta visual en la aplicación
        const alertDiv = document.createElement('div');
        alertDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
        alertDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🩺</span>
                    <span class="text-sm font-medium">${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 ml-2">
                    ✕
                </button>
            </div>
            <div class="mt-2 flex gap-2">
                <button onclick="window.location.hash='home'; this.parentElement.parentElement.remove()" class="bg-white text-blue-500 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100">
                    Ir a medir
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700">
                    Más tarde
                </button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remover después de 30 segundos
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
                // Verificar si ya se envió la notificación hoy
                const notificationKey = `${currentDate}-${index}`;
                if (!this.lastNotificationDate[notificationKey]) {
                    this.showNotification('Recordatorio de Glucometría', schedule.message);
                    this.lastNotificationDate[notificationKey] = true;
                    
                    // Limpiar notificaciones antiguas (más de 1 día)
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
        
        // Verificar cada minuto
        this.checkInterval = setInterval(() => {
            this.checkScheduledNotifications();
        }, 60000); // 60 segundos
        
        // Verificar inmediatamente
        this.checkScheduledNotifications();
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    getStatus() {
        return {
            enabled: this.notificationsEnabled,
            running: this.checkInterval !== null,
            scheduledTimes: this.scheduledTimes
        };
    }
}

// Instancia global del programador de notificaciones
const notificationScheduler = new NotificationScheduler();

// Función para habilitar notificaciones
async function enableNotifications() {
    const enabled = await notificationScheduler.requestPermission();
    if (enabled) {
        notificationScheduler.start();
        localStorage.setItem('notificationsEnabled', 'true');
        showAlert('Notificaciones habilitadas correctamente. Recibirás recordatorios para medir tu glucosa.', 'success');
        updateNotificationStatus();
    } else {
        showAlert('No se pudieron habilitar las notificaciones. Verifica los permisos del navegador.', 'warning');
    }
}

// Función para deshabilitar notificaciones
function disableNotifications() {
    notificationScheduler.stop();
    localStorage.setItem('notificationsEnabled', 'false');
    showAlert('Notificaciones deshabilitadas.', 'success');
    updateNotificationStatus();
}

// Función para actualizar el estado de las notificaciones en la UI
function updateNotificationStatus() {
    const status = notificationScheduler.getStatus();
    const statusElement = document.getElementById('notificationStatus');
    if (statusElement) {
        statusElement.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-sm ${status.enabled && status.running ? 'text-green-600' : 'text-gray-600'}">
                    ${status.enabled && status.running ? '🔔 Activas' : '🔕 Inactivas'}
                </span>
                <button onclick="${status.enabled && status.running ? 'disableNotifications()' : 'enableNotifications()'}" 
                        class="px-2 py-1 text-xs rounded ${status.enabled && status.running ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}">
                    ${status.enabled && status.running ? 'Desactivar' : 'Activar'}
                </button>
            </div>
        `;
    }
}