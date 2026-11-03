
        document.addEventListener('DOMContentLoaded', function () {
            // Events Data passed from Controller
            const events = @json($events);
            const weeklyHolidays = @json($weeklyHolidays); // Array of strings e.g. ["0", "6"]
            let currentDate = new Date();
            let currentMonth = currentDate.getMonth();
            let currentYear = currentDate.getFullYear();
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const calendarBody = document.getElementById('calendarBody');
            const monthYearLabel = document.getElementById('monthYear');
            const prevBtn = document.getElementById('prevMonthBtn');
            const nextBtn = document.getElementById('nextMonthBtn');
            const todayBtn = document.getElementById('todayBtn');
            function renderCalendar(month, year) {
                calendarBody.innerHTML = '';
                monthYearLabel.textContent = `${monthNames[month]} ${year}`;
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const daysInPrevMonth = new Date(year, month, 0).getDate();
                // Calculate total cells (prev month days + curr month days + next month days)
                // ensuring we fill complete rows
                let htmlHTML = '';
                // Previous Month's filler days
                for (let i = 0; i < firstDay; i++) {
                    const dayNum = daysInPrevMonth - firstDay + 1 + i;
                    htmlHTML += `<div class="day-cell other-month"><div class="day-number">${dayNum}</div></div>`;
                }
                // Current Month Days
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const currentDayOfWeek = new Date(year, month, day).getDay(); // 0-6
                    // Check if today
                    const isToday = day === currentDate.getDate() && month === currentDate.getMonth() && year === currentDate.getFullYear();
                    const todayClass = isToday ? 'current-day' : '';
                    // Find events
                    const dayEvents = events.filter(e => e.start === dateStr);
                    let eventsHtml = '';
                    dayEvents.forEach(e => {
                        eventsHtml += `<div class="event-badge" title="${e.title}">${e.title}</div>`;
                    });
                    // Check for Weekly Holiday weeklyHolidays might be strings or ints, handle looser comparison or ensure type
                    if (weeklyHolidays.includes(String(currentDayOfWeek)) || weeklyHolidays.includes(currentDayOfWeek)) {
                        // Only add if not already covered by a specific event (optional, but good for clarity) Or just add it as another badge
                        eventsHtml += `<div class="event-badge weekly-holiday-badge" title="Weekly Holiday">Weekend</div>`;
                    }
                    htmlHTML += `
                        <div class="day-cell ${todayClass}">
                            <div class="day-number">${day}</div>
                            ${eventsHtml}
                        </div>
                    `;
                }
                // Next Month's filler days to complete grid (up to 35 or 42 cells)
                const totalCellsSoFar = firstDay + daysInMonth;
                const remainingCells = (totalCellsSoFar % 7 === 0) ? 0 : 7 - (totalCellsSoFar % 7);
                for (let i = 1; i <= remainingCells; i++) {
                    htmlHTML += `<div class="day-cell other-month"><div class="day-number">${i}</div></div>`;
                }
                calendarBody.innerHTML = htmlHTML;
            }
            prevBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar(currentMonth, currentYear);
            });
            nextBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar(currentMonth, currentYear);
            });
            todayBtn.addEventListener('click', () => {
                currentDate = new Date();
                currentMonth = currentDate.getMonth();
                currentYear = currentDate.getFullYear();
                renderCalendar(currentMonth, currentYear);
            });
            // Initialize
            renderCalendar(currentMonth, currentYear);
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
