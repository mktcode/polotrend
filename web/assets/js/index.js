$(function () {
    var addpair = $('#addpair'),
        watchTemplate = $('#watch-template');

    // add watch
    $('#addpair-form').submit(function (e) {
        e.preventDefault();
        if (addpair.val()) {
            var pair = addpair.val(),
                pairLabel = pair.split('_'),
                watchHTML = watchTemplate.html();

            addpair.find('option:selected').prop('disabled', true);

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
                    watch.find('.watch-lowask').html(data[pair].lowestAsk);
                    watch.find('.watch-highbid').html(data[pair].highestBid);
                }
            );
        }

        return false;
    });

    // toggle ratios display
    $(document).on('click', '.toggle-ratio', function () {
        $(this).parents('.watch').find('.ratio-' + $(this).data('ratio')).toggleClass('uk-hidden');
        $(this).parents('li').toggleClass('uk-active');

        return false;
    });

    // toggle ratios display
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

        $(this).parents('li').toggleClass('uk-active');

        return false;
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

        return false;
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
                            }
                        }
                    }

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
                    } else if (sell1 > buy1) {
                        ratio = '<span class="uk-text-danger">1 : ' + formatRatio(sell1 / Math.max(buy1, 0.00000001));
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
    var wsuri = "wss://api.poloniex.com";
    var connection = new autobahn.Connection({
        url: wsuri,
        realm: "realm1"
    });

    connection.onopen = function (session) {
        console.log("Websocket connection opened!");

        function tickerEvent (ticker) {
            var watch = $('.watch[data-pair="' + ticker[0] + '"]', '#watches');
            watch.find('.watch-ticker').html(ticker[1]);
        }

        session.subscribe('ticker', tickerEvent);
    };

    connection.onclose = function () {
        console.log("Websocket connection closed!");
    };

    connection.open();
});