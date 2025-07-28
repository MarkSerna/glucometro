// js/analysis.js

import { getTargetRanges } from './storage.js';

export function analyzeGlucoseData(data) {
    const targetRanges = getTargetRanges();
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

    const totalReadings = measurements.length;
    const badPercentage = Math.round((badReadings / totalReadings) * 100);
    const goodPercentage = Math.round((goodReadings / totalReadings) * 100);
    const averageGlucose = Math.round(measurements.reduce((sum, m) => sum + m.value, 0) / totalReadings);
    const totalInsulin = data.insulinBreakfast + data.insulinLunch + data.insulinDinner;

    const glucoseValues = measurements.map(m => m.value);
    const averageGlucose = glucoseValues.reduce((sum, v) => sum + v, 0) / glucoseValues.length;
    const stdDev = Math.sqrt(glucoseValues.map(x => Math.pow(x - averageGlucose, 2)).reduce((a, b) => a + b, 0) / glucoseValues.length);

    return {
        alerts,
        statistics: {
            stdDev,
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

export function generateRecommendations(analysis) {
    const recommendations = [];
    const { statistics, measurements, insulinData } = analysis;

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

    const targetRanges = getTargetRanges();
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

    if (insulinData.total === 0) {
        recommendations.push({
            icon: '💉',
            text: 'No se registró uso de insulina. Si está prescrita, asegúrese de aplicarla según indicaciones médicas.'
        });
    }

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
