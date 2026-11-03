
        // ===== ApexCharts Growth Chart =====
        var growthData = @json($monthly_growth);
        var months = growthData.map(d => d.month);
        var businesses = growthData.map(d => d.businesses);
        var staffData = growthData.map(d => d.staff);
        var revenue = growthData.map(d => d.revenue);
        var options = {
            chart: {
                type: 'bar',
                height: 280,
                toolbar: { show: false },
                fontFamily: 'inherit',
            },
            series: [
                { name: 'Businesses', data: businesses },
                { name: 'Staff', data: staffData },
            ],
            xaxis: {
                categories: months,
                labels: { style: { fontSize: '12px', colors: '#9ca3af' } },
                axisBorder: { show: false }, axisTicks: { show: false },
            },
            yaxis: {
                labels: { style: { colors: '#9ca3af', fontSize: '12px' } },
            },
            colors: ['#6366f1', '#10b981'],
            plotOptions: {
                bar: { columnWidth: '55%', borderRadius: 5, borderRadiusApplication: 'end' }
            },
            dataLabels: { enabled: false },
            legend: {
                position: 'top', horizontalAlign: 'right',
                labels: { colors: '#6b7280' },
                markers: { radius: 4 },
            },
            grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
            tooltip: {
                theme: 'light',
                y: { formatter: val => val + ' records' }
            },
        };
        var chart = new ApexCharts(document.querySelector('#saGrowthChart'), options);
        chart.render();
    

/* ---- raw @section(scripts) remainder ---- */

    
