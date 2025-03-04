document.addEventListener('DOMContentLoaded', function() {
    // Initialize Charts
    initializeDispositionChart();
    initializeGeographicChart();

    // Add event listeners for time period buttons
    document.querySelectorAll('.btn-group .btn').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            this.parentElement.querySelectorAll('.btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            this.classList.add('active');
            // Update data based on selected period
            updateActivityData(this.textContent.toLowerCase());
        });
    });

    // Add event listener for geographic view selector
    const geoViewSelect = document.querySelector('select[aria-label="Geographic View"]');
    if (geoViewSelect) {
        geoViewSelect.addEventListener('change', function() {
            updateGeographicData(this.value);
        });
    }
});

function initializeDispositionChart() {
    const ctx = document.getElementById('dispositionChart');
    if (!ctx) return;

    const data = JSON.parse(ctx.getAttribute('data-values') || '[]');
    const labels = JSON.parse(ctx.getAttribute('data-labels') || '[]');
    const colors = JSON.parse(ctx.getAttribute('data-colors') || '[]');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            cutout: '70%'
        }
    });
}

function initializeGeographicChart() {
    const ctx = document.getElementById('geoDistributionChart');
    if (!ctx) return;

    const data = JSON.parse(ctx.getAttribute('data-values') || '[]');
    const labels = JSON.parse(ctx.getAttribute('data-labels') || '[]');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Records',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function updateActivityData(period) {
    try {
        const response = await fetch(`/dashboard/activity?period=${period}`);
        const data = await response.json();
        
        const activityTable = document.querySelector('.activity-table tbody');
        if (!activityTable) return;

        activityTable.innerHTML = data.map(activity => `
            <tr>
                <td>
                    <span class="badge bg-${getActivityBadgeColor(activity.type)}">
                        <i class="bi bi-${getActivityIcon(activity.type)}"></i>
                        ${activity.type}
                    </span>
                </td>
                <td>
                    ${activity.description}
                    ${activity.metadata ? `<br><small class="text-muted">${activity.metadata}</small>` : ''}
                </td>
                <td>
                    <div>${activity.timeFormatted}</div>
                    <small class="text-muted">${activity.dateFormatted}</small>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error updating activity data:', error);
    }
}

async function updateGeographicData(view) {
    try {
        const response = await fetch(`/dashboard/geographic?view=${view}`);
        const data = await response.json();
        
        const chart = Chart.getChart('geoDistributionChart');
        if (!chart) return;

        chart.data.labels = data.labels;
        chart.data.datasets[0].data = data.data;
        chart.update();
    } catch (error) {
        console.error('Error updating geographic data:', error);
    }
}

function getActivityBadgeColor(type) {
    switch (type.toLowerCase()) {
        case 'upload': return 'primary';
        case 'download': return 'success';
        case 'disposition': return 'info';
        default: return 'secondary';
    }
}

function getActivityIcon(type) {
    switch (type.toLowerCase()) {
        case 'upload': return 'upload';
        case 'download': return 'download';
        case 'disposition': return 'telephone';
        default: return 'activity';
    }
}
