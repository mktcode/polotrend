$(function () {
    var addpair = $('#addpair'),
        watchTemplate = $('#watch-template'),
        titleTag = $('title'),
        titlePair = false;

    // load watches from storage
    var watchesFromStorage = JSON.parse(localStorage.getItem('watches'));
    for (var i = 0; i < watchesFromStorage.length; i++) {
        if (watchesFromStorage[i]) {
            addWatch(watchesFromStorage[i]);
        }
    }

    // add watch
    $('#addpair-form').submit(function (e) {
        e.preventDefault();
        var pair = addpair.val();
        if (pair) {
            addWatch(pair);
            saveWatchToStorage(pair);
        }
    });

    function addWatch(pair) {
        var pairLabel = pair.split('_'),
            watchHTML = watchTemplate.html();

        addpair.find('option[value="' + pair + '"]').prop('disabled', true);

        var watch = $(watchHTML);
        watch.find('.poloniex-link').attr('href', 'https://poloniex.com/exchange#' + pair).html(pairLabel[1] + '/' + pairLabel[0]);
        watch.data('pair', pair).attr('data-pair', pair);
        watch.hide();
        watch.appendTo('#watches');
        watch.fadeIn();

        // get initial data
        $.get(
            'https://poloniex.com/public',
            {command: 'returnTicker'},
            function(data) {
                watch.find('.watch-ticker').html(data[pair].last);
                watch.find('.price-notification-input').val(data[pair].last);
                watch.find('.watch-lowask').html(data[pair].lowestAsk);
                watch.find('.watch-highbid').html(data[pair].highestBid);
            }
        );

        return false;
    }

    function saveWatchToStorage(pair) {
        if (typeof(Storage) !== "undefined") {
            var watches = JSON.parse(localStorage.getItem('watches'));

            if (!watches) {
                watches = [];
                watches.push(pair);
            }

            if (watches.indexOf(pair) == -1) {
                watches.push(pair);
            }

            localStorage.setItem('watches', JSON.stringify(watches));
        }
    }

    function deleteWatchFromStorage(pair) {
        if (typeof(Storage) !== "undefined") {
            var watches = JSON.parse(localStorage.getItem('watches'));

            watches = jQuery.grep(watches, function(value) {
                return value != pair;
            });

            localStorage.setItem('watches', JSON.stringify(watches));
        }
    }

    // toggle ratios display
    $(document).on('click', '.toggle-ratio', function () {
        $(this).parents('.watch').find('.ratio-' + $(this).data('ratio')).toggleClass('uk-hidden');
        $(this).parents('li').toggleClass('uk-active');

        return false;
    });

    // toggle notifications
    var notifications = {};
    $(document).on('click', '.toggle-notification', function () {
        var pair = $(this).parents('.watch').data('pair'),
            ratio = $(this).data('ratio');

        if (pair in notifications) {
            if ('n' + ratio in notifications[pair]) {
                notifications[pair]['n' + ratio] = notifications[pair]['n' + ratio] ? 0 : 1;
            } else {
                notifications[pair]['n' + ratio] = 1;
            }
        } else {
            notifications[pair] = {};
            notifications[pair]['n' + ratio] = 1;
        }

        if (notifications[pair]['n' + ratio] == 1 && !Push.Permission.has()) {
            Push.Permission.request();
        }

        if (notifications[pair]['n' + ratio] == 1) {
            UIkit.notification({
                message: 'Notification enabled!',
                status: 'success',
                pos: 'bottom-center',
                timeout: 3000
            });
        } else {
            UIkit.notification({
                message: 'Notification disabled!',
                status: 'danger',
                pos: 'bottom-center',
                timeout: 3000
            });
        }

        $(this).parents('li').toggleClass('uk-active');

        return false;
    });

    // toggle price notification
    var priceNotifications = {};
    $(document).on('click', '.price-notification-toggle', function () {
        var pair = $(this).parents('.watch').data('pair'),
            triggerPrice = $(this).parent().find('.price-notification-input').val();

        if ($(this).prop('checked')) {
            priceNotifications[pair] = triggerPrice;
            UIkit.notification({
                message: 'Notification enabled!',
                status: 'success',
                pos: 'bottom-center',
                timeout: 3000
            });
            if (!Push.Permission.has()) {
                Push.Permission.request();
            }
        } else {
            priceNotifications[pair] = false;
            UIkit.notification({
                message: 'Notification disabled!',
                status: 'danger',
                pos: 'bottom-center',
                timeout: 3000
            });
        }
    });
    $(document).on('change', '.price-notification-input', function () {
        var watch = $(this).parents('.watch');
        if ($(this).parents('.watch').find('.price-notification-toggle').prop('checked')) {
            priceNotifications[watch.data('pair')] = $(this).val();
            UIkit.notification({
                message: 'Trigger price changed!',
                status: 'success',
                pos: 'bottom-center',
                timeout: 3000
            });
        }
    });
    $(document).on('submit', '.price-notification-form', function (e) {
        e.preventDefault();
    });

    // remove watch
    $(document).on('click', '.watch-close', function (e) {
        e.preventDefault();
        var watch = $(this).parents('.watch'),
            pair = watch.data('pair');

        addpair.find('option[value="' + pair + '"]').prop('disabled', false);

        watch.fadeOut(function () {
            $(this).remove();
        });

        deleteWatchFromStorage(pair);

        return false;
    });

    // set pair to show in title
    $(document).on('change', '#watches .show-in-title-toggle', function () {
        if ($(this).prop('checked')) {
            titlePair = $(this).parents('.watch').data('pair');
        } else {
            titlePair = false;
            titleTag.text('Polotrend - See when people start to buy or sell on Poloniex!');
        }
        $('.show-in-title-toggle', '#watches').not($(this)).each(function (i, item) {
            $(this).prop('checked', false);
        });
    });

    // update values
    var interval = 5000,
        ratioHistory = {};
    setInterval(function () {
        var time = moment.utc().unix(),
            watches = $('.watch', '#watches');

        for (var i = 0; i < watches.length; i++) {
            var watch = $(watches[i]),
                pair = watch.data('pair');

            $.ajax({
                url: 'https://poloniex.com/public',
                data: {command: 'returnTradeHistory', currencyPair: pair, start: time - 3600, end: time},
                method: 'GET',
                dataType: 'JSON',
                context: watch,
                success: function(data) {
                    var pair = $(this).data('pair'),
                        tradeCount1 = 0,
                        buy1 = 0,
                        sell1 = 0,
                        buy5 = 0,
                        sell5 = 0,
                        buy15 = 0,
                        sell15 = 0,
                        buy30 = 0,
                        sell30 = 0,
                        buy60 = 0,
                        sell60 = 0;

                    // set trades per minute
                    if (data.length) {
                        $(this).find('.watch-trades-per-minute > .avg').text((data.length / 60).toFixed(2));
                    }

                    for (var j = 0; j < data.length; j++) {
                        var trade = data[j],
                            tradeTime = moment.utc(trade.date).unix(),
                            tradeAmount = parseFloat(trade.amount);

                        if (trade.type == 'buy') {
                            if (time - tradeTime < 3600) {
                                buy60 = buy60 + tradeAmount;
                            }
                            if (time - tradeTime < 1800) {
                                buy30 = buy30 + tradeAmount;
                            }
                            if (time - tradeTime < 900) {
                                buy15 = buy15 + tradeAmount;
                            }
                            if (time - tradeTime < 300) {
                                buy5 = buy5 + tradeAmount;
                            }
                            if (time - tradeTime < 60) {
                                buy1 = buy1 + tradeAmount;
                                tradeCount1++;
                            }
                        } else if (trade.type == 'sell') {
                            if (time - tradeTime < 3600) {
                                sell60 = sell60 + tradeAmount;
                            }
                            if (time - tradeTime < 1800) {
                                sell30 = sell30 + tradeAmount;
                            }
                            if (time - tradeTime < 900) {
                                sell15 = sell15 + tradeAmount;
                            }
                            if (time - tradeTime < 300) {
                                sell5 = sell5 + tradeAmount;
                            }
                            if (time - tradeTime < 60) {
                                sell1 = sell1 + tradeAmount;
                                tradeCount1++;
                            }
                        }
                    }

                    $(this).find('.watch-trades-per-minute > .last').text((tradeCount1).toFixed(2));

                    // set indicator (based on 5 min ratio)
                    var ratioHeight = 1;
                    if (buy15 > sell15) {
                        ratioHeight = (sell15 / buy15).toFixed(2);
                        $(this).find('.indicator').find('.down').css('height', '0');
                        $(this).find('.indicator').find('.up').css('height', Math.floor((1 - ratioHeight) * 50) + '%');
                    } else {
                        ratioHeight = (buy15 / sell15).toFixed(2);
                        $(this).find('.indicator').find('.up').css('height', '0');
                        $(this).find('.indicator').find('.down').css('height', Math.floor((1 - ratioHeight) * 50) + '%');
                    }

                    // set 1min ration
                    var ratio = '1 : 1';
                    if (buy1 > sell1) {
                        ratio = '<span class="uk-text-success">' + formatRatio(buy1 / Math.max(sell1, 0.00000001)) + ' : 1</span>';
                        if (titlePair == pair) {
                            titleTag.html('&uArr; ' + pair + ' ' + formatRatio(buy1 / Math.max(sell1, 0.00000001)) + ' : 1');
                        }
                    } else if (sell1 > buy1) {
                        ratio = '<span class="uk-text-danger">1 : ' + formatRatio(sell1 / Math.max(buy1, 0.00000001));
                        if (titlePair == pair) {
                            titleTag.html('&dArr; ' + pair + ' 1 : ' + formatRatio(sell1 / Math.max(buy1, 0.00000001)));
                        }
                    }
                    $(this).find('.watch-buysell-1').html(ratio);

                    // set 5min ration
                    ratio = '1 : 1';
                    if (buy5 > sell5) {
                        ratio = '<span class="uk-text-success">' + formatRatio(buy5 / Math.max(sell5, 0.00000001)) + ' : 1</span>';
                    } else if (sell5 > buy5) {
                        ratio = '<span class="uk-text-danger">1 : ' + formatRatio(sell5 / Math.max(buy5, 0.00000001));
                    }
                    $(this).find('.watch-buysell-5').html(ratio);

                    // set 15 min ratio
                    ratio = '1 : 1';
                    if (buy15 > sell15) {
                        ratio = '<span class="uk-text-success">' + formatRatio(buy15 / Math.max(sell15, 0.00000001)) + ' : 1</span>';
                    } else if (sell15 > buy15) {
                        ratio = '<span class="uk-text-danger">1 : ' + formatRatio(sell15 / Math.max(buy15, 0.00000001));
                    }
                    $(this).find('.watch-buysell-15').html(ratio);

                    // set 30 min ratio
                    ratio = '1 : 1';
                    if (buy30 > sell30) {
                        ratio = '<span class="uk-text-success">' + formatRatio(buy30 / Math.max(sell30, 0.00000001)) + ' : 1</span>';
                    } else if (sell30 > buy30) {
                        ratio = '<span class="uk-text-danger">1 : ' + formatRatio(sell30 / Math.max(buy30, 0.00000001));
                    }
                    $(this).find('.watch-buysell-30').html(ratio);

                    // set 60 min ratio
                    ratio = '1 : 1';
                    if (buy60 > sell60) {
                        ratio = '<span class="uk-text-success">' + formatRatio(buy60 / Math.max(sell60, 0.00000001)) + ' : 1</span>';
                    } else if (sell60 > buy60) {
                        ratio = '<span class="uk-text-danger">1 : ' + formatRatio(sell60 / Math.max(buy60, 0.00000001));
                    }
                    $(this).find('.watch-buysell-60').html(ratio);

                    // trigger alerts
                    if (pair in notifications && Push.Permission.has()) {
                        if (pair in ratioHistory) {
                            if (ratioHistory[pair]['ratio1'] != buy1 > sell1) {
                                if ('n1' in notifications[pair] && notifications[pair]['n1']) {
                                    Push.create('PoloTrend', {
                                        body: buy1 > sell1 ? pair + ' goes up!' : pair + ' goes down!',
                                        timeout: 5000,
                                        icon: 'assets/img/push-icon.png',
                                        onClick: function () {
                                            window.focus();
                                            this.close();
                                        }
                                    });
                                    playNotificationSound();
                                }
                            }
                            if (ratioHistory[pair]['ratio5'] != buy5 > sell5) {
                                if ('n5' in notifications[pair] && notifications[pair]['n5']) {
                                    Push.create('PoloTrend', {
                                        body: buy5 > sell5 ? pair + ' goes up!' : pair + ' goes down!',
                                        timeout: 5000,
                                        icon: 'assets/img/push-icon.png',
                                        onClick: function () {
                                            window.focus();
                                            this.close();
                                        }
                                    });
                                    playNotificationSound();
                                }
                            }
                            if (ratioHistory[pair]['ratio15'] != buy15 > sell15) {
                                if ('n15' in notifications[pair] && notifications[pair]['n15']) {
                                    Push.create('PoloTrend', {
                                        body: buy15 > sell15 ? pair + ' goes up!' : pair + ' goes down!',
                                        timeout: 5000,
                                        icon: 'assets/img/push-icon.png',
                                        onClick: function () {
                                            window.focus();
                                            this.close();
                                        }
                                    });
                                    playNotificationSound();
                                }
                            }
                            if (ratioHistory[pair]['ratio30'] != buy30 > sell30) {
                                if ('n30' in notifications[pair] && notifications[pair]['n30']) {
                                    Push.create('PoloTrend', {
                                        body: buy30 > sell30 ? pair + ' goes up!' : pair + ' goes down!',
                                        timeout: 5000,
                                        icon: 'assets/img/push-icon.png',
                                        onClick: function () {
                                            window.focus();
                                            this.close();
                                        }
                                    });
                                    playNotificationSound();
                                }
                            }
                            if (ratioHistory[pair]['ratio60'] != buy60 > sell60) {
                                if ('n60' in notifications[pair] && notifications[pair]['n60']) {
                                    Push.create('PoloTrend', {
                                        body: buy60 > sell60 ? pair + ' goes up!' : pair + ' goes down!',
                                        timeout: 5000,
                                        icon: 'assets/img/push-icon.png',
                                        onClick: function () {
                                            window.focus();
                                            this.close();
                                        }
                                    });
                                    playNotificationSound();
                                }
                            }
                        }
                    }

                    ratioHistory[pair] = {};
                    ratioHistory[pair]['ratio1'] = buy1 > sell1;
                    ratioHistory[pair]['ratio5'] = buy5 > sell5;
                    ratioHistory[pair]['ratio15'] = buy15 > sell15;
                    ratioHistory[pair]['ratio30'] = buy30 > sell30;
                    ratioHistory[pair]['ratio60'] = buy60 > sell60;
                }
            });
        }
    }, interval);

    function formatRatio(value) {
        value = value.toFixed(2);
        if (value > 1000000000) {
            value = Math.floor(value / 1000000) + 'B';
        } else if (value > 1000000) {
            value = Math.floor(value / 1000000) + 'M';
        } else if (value > 1000) {
            value = Math.floor(value / 1000) + 'K';
        }

        return value;
    }

    // update price ticker with websocket
    var priceHistory = {},
        wsuri = "wss://api.poloniex.com",
        connection = new autobahn.Connection({
            url: wsuri,
            realm: "realm1"
        });
    connection.onopen = function (session) {
        console.log("Websocket connection opened!");

        function tickerEvent (ticker) {
            var watch = $('.watch[data-pair="' + ticker[0] + '"]', '#watches');
            watch.find('.watch-ticker').html(ticker[1]);
            if (ticker[0] in priceHistory && ticker[0] in priceNotifications && priceNotifications[ticker[0]]) {
                if (
                    (priceHistory[ticker[0]] < priceNotifications[ticker[0]] && ticker[1] >= priceNotifications[ticker[0]])
                    ||
                    (priceHistory[ticker[0]] > priceNotifications[ticker[0]] && ticker[1] <= priceNotifications[ticker[0]])
                ) {
                    Push.create('PoloTrend', {
                        body: ticker[0] + ' reached ' + priceNotifications[ticker[0]] + '! (' + ticker[1] + ')',
                        timeout: 5000,
                        icon: 'assets/img/push-icon.png',
                        onClick: function () {
                            window.focus();
                            this.close();
                        }
                    });
                    playNotificationSound();
                    priceNotifications[ticker[0]] = false;
                    watch.find('.price-notification-toggle').prop('checked', false);
                }
            }

            // set new history entry
            priceHistory[ticker[0]] = ticker[1];
        }

        session.subscribe('ticker', tickerEvent);
    };
    connection.onclose = function () {
        console.log("Websocket connection closed!");
    };
    connection.open();

    // init sounds
    ion.sound({
        sounds: [
            {
                name: "notification"
            }
        ],
        volume: 1,
        path: "assets/audio/",
        preload: true
    });

    var playNotificationSounds = true;
    function playNotificationSound() {
        if (playNotificationSounds) {
            ion.sound.play("notification");
        }
    }

    $('#toggleNotificationSounds').click(function () {
        $(this).find('i').toggleClass('fa-volume-up fa-volume-off');
        playNotificationSounds = playNotificationSounds ? 0 : 1;
        if (playNotificationSounds) {
            ion.sound.play("notification");
        }
        return false;
    });
});