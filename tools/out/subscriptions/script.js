document.addEventListener('DOMContentLoaded', function() { toastr.info("{{ session('info') }}"); });
document.addEventListener('DOMContentLoaded', function() { toastr.warning("{{ session('warning') }}"); });

                        document.addEventListener('DOMContentLoaded', function() {
                            @foreach($errors->all() as $error)
                                toastr.error("{{ $error }}");
                            @endforeach
                        });
                    

        const currentActiveStaff = {{ $active_staff_count ?? 0 }};
        const subscriptionCurrentSeats = {{ isset($subscription) && $subscription ? $subscription->seats : 0 }};
        const subscriptionPricePerSeat = {{ isset($subscription) && $subscription ? $subscription->price_per_seat : 300 }};

        function adjustIncreaseInput(delta) {
            const input = document.getElementById('additional_seats_input');
            if (!input) return;
            let val = parseInt(input.value) || 1;
            val = Math.max(1, Math.min(500, val + delta));
            input.value = val;
            updateIncreaseSeatsCalc(val);
        }

        function updateIncreaseSeatsCalc(val) {
            const addSeats = parseInt(val) || 1;
            const newTotal = subscriptionCurrentSeats + addSeats;
            const additionalAmount = subscriptionPricePerSeat * addSeats;

            const seatCountEl = document.getElementById('inc_seat_count');
            const newTotalEl = document.getElementById('inc_new_total');
            const totalAmountEl = document.getElementById('inc_total_amount');

            if (seatCountEl) seatCountEl.textContent = addSeats;
            if (newTotalEl) newTotalEl.textContent = newTotal;
            if (totalAmountEl) totalAmountEl.textContent = '₹' + additionalAmount.toLocaleString('en-IN');
        }

        function checkSeatValidation(selectedSeats) {
            const alertBox = document.getElementById('seatLimitAlert');
            const payBtn = document.getElementById('payBtn');
            const kelviqPayBtn = document.getElementById('kelviq_payBtn');

            if (currentActiveStaff > 0 && selectedSeats < currentActiveStaff) {
                const needed = currentActiveStaff - selectedSeats;
                if (alertBox) {
                    document.getElementById('alert_active_staff').textContent = currentActiveStaff;
                    document.getElementById('alert_selected_seats').textContent = selectedSeats;
                    document.getElementById('alert_deactivate_needed').textContent = needed;
                    alertBox.style.display = 'block';
                }
                if (payBtn) payBtn.disabled = true;
                if (kelviqPayBtn) kelviqPayBtn.disabled = true;
            } else {
                if (alertBox) alertBox.style.display = 'none';
                if (payBtn) payBtn.disabled = false;
                if (kelviqPayBtn) kelviqPayBtn.disabled = false;
            }
        }

        const cashfreePlans = {
            'monthly': {
                'label': 'Hajri Monthly Plan',
                'price_per_seat_yearly': 300,
                'billing_cycle': 'monthly'
            },
            'yearly': {
                'label': 'Hajri Yearly Plan',
                'price_per_seat_yearly': 3000,
                'billing_cycle': 'yearly'
            }
        };
        const kelviqPlansData = {
            'monthly': {
                'label': 'Hajri Monthly Plan',
                'price_per_seat_yearly': 3,
                'billing_cycle': 'monthly'
            },
            'yearly': {
                'label': 'Hajri Yearly Plan',
                'price_per_seat_yearly': 30,
                'billing_cycle': 'yearly'
            }
        };
        let selectedPlan = 'monthly';
        let seats = 1;
        const priceMap = {
            monthly: 300,
            yearly: 3000
        };
        const kelviqPriceMap = {
            monthly: 3,
            yearly: 30
        };
        const periodLabel = {
            monthly: 'mo',
            yearly: 'yr'
        };
        let kelviq_selectedPlan = 'monthly';
        let kelviq_seats = 1;

        function selectPlanKelviq(plan) {
            kelviq_selectedPlan = plan;
            if (document.getElementById('kelviq_selectedPlan')) {
                document.getElementById('kelviq_selectedPlan').value = plan;
                document.getElementById('kelviq_selectedBilling').value = kelviqPlansData[plan].billing_cycle;
            }
            document.querySelectorAll('#kelviq-payment-method .plan-card').forEach(c => {
                c.classList.remove('selected');
            });
            const card = document.getElementById('kelviq_card-' + plan);
            if (card) card.classList.add('selected');

            const radio = document.querySelector('input[name="kelviq_plan_radio"][value="' + plan + '"]');
            if (radio) radio.checked = true;
            if (document.getElementById('kelviq_summaryPlan')) {
                document.getElementById('kelviq_summaryPlan').textContent = kelviqPlansData[plan].label;
                document.getElementById('kelviq_summaryBilling').textContent = kelviqPlansData[plan].label;
            }
            updatePricingKelviq();
        }

        function updateSeatsKelviq(val) {
            kelviq_seats = parseInt(val);
            if (document.getElementById('kelviq_seatDisplay')) {
                document.getElementById('kelviq_seatDisplay').textContent = kelviq_seats;
                document.getElementById('kelviq_seatsInput').value = kelviq_seats;
                document.getElementById('kelviq_summarySeats').textContent = kelviq_seats;
            }
            updatePricingKelviq();
            checkSeatValidation(kelviq_seats);
        }

        function updatePricingKelviq() {
            const pps = kelviqPriceMap[kelviq_selectedPlan];
            const period = periodLabel[kelviq_selectedPlan];
            const total = pps * kelviq_seats;
            if (document.getElementById('kelviq_summaryPricePerSeat')) {
                document.getElementById('kelviq_summaryPricePerSeat').textContent =
                    '$' + pps.toLocaleString('en-US') + ' / ' + period;
                document.getElementById('kelviq_summaryTotal').textContent =
                    '$' + total.toLocaleString('en-US');
            }
        }

        function handleSubmitKelviq(e) {
            const btn = document.getElementById('kelviq_payBtn');
            const txt = document.getElementById('kelviq_payBtnText');
            const spinner = document.getElementById('kelviq_payBtnSpinner');
            if (txt) txt.textContent = 'Redirecting to Kelviq…';
            if (spinner) spinner.style.display = 'inline-block';
            if (btn) btn.disabled = true;
        }

        function selectPlan(plan) {
            selectedPlan = plan;
            if (document.getElementById('selectedPlan')) {
                document.getElementById('selectedPlan').value = plan;
                document.getElementById('selectedBilling').value = cashfreePlans[plan].billing_cycle;
            }
            document.querySelectorAll('.plan-card').forEach(c => {
                c.classList.remove('selected');
            });
            const card = document.getElementById('card-' + plan);
            if (card) card.classList.add('selected');

            const radio = document.querySelector('input[name="plan_radio"][value="' + plan + '"]');
            if (radio) radio.checked = true;
            if (document.getElementById('summaryPlan')) {
                document.getElementById('summaryPlan').textContent = cashfreePlans[plan].label;
                document.getElementById('summaryBilling').textContent = cashfreePlans[plan].label;
            }
            updatePricing();
        }

        function updateSeats(val) {
            seats = parseInt(val);
            if (document.getElementById('seatDisplay')) {
                document.getElementById('seatDisplay').textContent = seats;
                document.getElementById('seatsInput').value = seats;
                document.getElementById('summarySeats').textContent = seats;
            }
            updatePricing();
            checkSeatValidation(seats);
        }

        function updatePricing() {
            const pps = priceMap[selectedPlan];
            const period = periodLabel[selectedPlan];
            const total = pps * seats;
            if (document.getElementById('summaryPricePerSeat')) {
                document.getElementById('summaryPricePerSeat').textContent =
                    '₹' + pps.toLocaleString('en-IN') + ' / ' + period;
                document.getElementById('summaryTotal').textContent =
                    '₹' + total.toLocaleString('en-IN');
            }
        }

        function handleSubmit(e) {
            const btn = document.getElementById('payBtn');
            const txt = document.getElementById('payBtnText');
            const spinner = document.getElementById('payBtnSpinner');
            if (txt) txt.textContent = 'Redirecting to Cashfree…';
            if (spinner) spinner.style.display = 'inline-block';
            if (btn) btn.disabled = true;
        }

        document.addEventListener('DOMContentLoaded', function () {
            const activeTabId = localStorage.getItem('activeSubscriptionTab');
            if (activeTabId) {
                const activeTab = document.getElementById(activeTabId);
                if (activeTab) {
                    if (typeof bootstrap !== 'undefined') {
                        const tab = new bootstrap.Tab(activeTab);
                        tab.show();
                    } else {
                        activeTab.click();
                    }
                }
            }
            const triggerTabList = document.querySelectorAll('#v-pills-tab .nav-link[data-bs-toggle="pill"]');
            triggerTabList.forEach(function (triggerEl) {
                triggerEl.addEventListener('shown.bs.tab', function (event) {
                    localStorage.setItem('activeSubscriptionTab', event.target.id);
                });
            });
            if (document.getElementById('selectedPlan')) {
                selectPlan('monthly');
                updateSeats(1);
            }
            if (document.getElementById('kelviq_selectedPlan')) {
                selectPlanKelviq('monthly');
                updateSeatsKelviq(1);
            }
        });
    

/* ---- raw @section(scripts) remainder ---- */
