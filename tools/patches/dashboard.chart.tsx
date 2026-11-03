<div id="chart">
                                <ApexChart
                                    type="bar"
                                    height={300}
                                    series={[
                                        { name: 'On Time', data: presentCounts },
                                        { name: 'Absent / No Data', data: absentCounts },
                                        { name: 'Half Leave', data: halfdayCounts },
                                    ]}
                                    options={{
                                        chart: { type: 'bar', height: 300, stacked: true, toolbar: { show: false }, zoom: { enabled: true } },
                                        plotOptions: { bar: { horizontal: false, borderRadius: 5 } },
                                        xaxis: { type: 'category', categories: Array.from({ length: days }, (_, i) => String(i + 1)) },
                                        yaxis: { min: 0, max: yMax, tickAmount: yMax < 6 ? yMax : 6, labels: { style: { fontSize: '14px' }, formatter: (v: number) => v.toFixed(0) } },
                                        legend: { position: 'bottom', offsetX: -50 },
                                        fill: { opacity: 1 },
                                        dataLabels: { enabled: false },
                                        colors: ['#3AC74B', '#FF6857', '#FEBD0B'],
                                        responsive: [
                                            { breakpoint: 1024, options: { chart: { height: 250 }, legend: { position: 'bottom', fontSize: '12px', offsetX: -10 } } },
                                            { breakpoint: 600, options: { chart: { height: 200 }, plotOptions: { bar: { borderRadius: 2, columnWidth: '70%' } }, legend: { position: 'bottom', fontSize: '10px', offsetX: 0 } } },
                                        ],
                                    }}
                                />
                            </div>
