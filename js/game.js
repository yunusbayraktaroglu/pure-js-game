/**
 * Pure JavaScript Browser Game
 *
 * @HowItWorks : When user starts to drag card, a timer starts to run. If there is sufficient distance between
 * the start and end points after 100ms, an ENDFRAME value occurs depending on the length of the distance.
 * The <render.update> function works until STARTFRAME reach to the ENDFRAME. The value is calculated on
 * a lap basis and reflected to the user. Finally, the result is checked.
 *
 * @author : Yunus Bayraktaroğlu
 *   <github.com/yunusbayraktaroglu/pure-js-game>
 *   <behance.com/yunusbayraktaroglu>
 *
 * @dependency : parallax-scene.js
 *
 **/

var cardGame = function(bg) {

    "use strict";

    var background = bg;

        // DOM nodes
    var $preloader = document.querySelector("#preloader"),
        $preloaderPer = $preloader.querySelector(".per"),
        $preloaderInfo = $preloader.querySelector(".inf"),
        $gameLayer = document.getElementById("game_layer"),
        $gameArea = document.getElementById("game_area"),
        $images = document.getElementById("sequence_images"),
        $readyImg = document.getElementById("ready-img"),
        $flipImg = document.getElementById("flip-img"),
        $wonImage = document.getElementById("won_image"),
        $floor = document.getElementById("floor"),
        $game = document.querySelector(".card-images"),
        $lapCounter = document.querySelector("#lap_counter"),
        // Debug Nodes
        $status = document.querySelector(".status"),
        $visibleFrame = document.querySelector(".visibleframe"),
        $targetFrame = document.querySelector(".targetframe"),
        // Sounds
        turnSnd = new Audio("swoosh.mp3"),
        readySnd = new Audio("ready.mp3");


    var gameStatus = {
        totalFrame: 70,
        endFrame: 0,
        startFrame: 5,
        currentFrame: 0,
        currentLap: 0,
        soundLap: 0.5,
        targetNumbers: [],
        speedMultipler: 1,
        easing: 0.02,
        ready: false,
        handlers: function() {
            if ( background.model.sceneProperties.interactionWay === "touch" ) {
                return ["touchstart","touchmove","touchend"];
            } else {
                return ["mousedown","mousemove","mouseup"];
            }
        }(),
        checkResult: true,
        gift: false,
        won: false,
        startPosition: 0,
        endPosition: 0,
        ticker: 0
    };



    // This module handles initializing part
    //
    var gameInitializer = {

        loadedImages: 0,
        resized: false,

        start: function () {
            this.loadGiftImage();
            $preloaderInfo.innerHTML = "Game Loading";
        },
        loadGiftImage: function() {
            var giftImage = new Image();
            giftImage.src = "img/gift.png";
            giftImage.onload = function(){
                gameInitializer.loadImage();
            };
        },
        loadImage: function () {
            var downloadingImage = new Image();
            downloadingImage.src = "img/sequence/sequence_" + (this.loadedImages + 1) + ".png";
            downloadingImage.onload = function(){

                $images.src = this.src;
                gameInitializer.imageLoaded();
                if (!this.resized) {
                    this.resized = true;
                    resize();
                    setTimeout(function () {
                        $game.classList.remove("opacity-0");
                    },300);
                }
            };
        },
        imageLoaded: function() {
            this.loadedImages += 1;
            $preloaderPer.innerHTML = Math.floor(this.loadedImages / gameStatus.totalFrame * 100) + "%";

            if ( this.loadedImages == gameStatus.totalFrame ) {
                document.body.removeChild($preloader);
                gameInitializer.showSequence();
            } else {
                gameInitializer.loadImage();
            }
        },
        showSequence: function() {
            gameStatus.endFrame = 148;
            render.refresh();
        }
    };


    // This module handles rendering part
    //
    var render = {
        refresh: function() {
            if ( gameStatus.ticker === 0 ) {
                gameStatus.ticker = self.setInterval(render.update, Math.round(1000 / 60));
                $status.innerHTML = "Rendering";
            }
        },
        update: function() {
            if ( gameStatus.currentFrame !== gameStatus.endFrame ) {
                gameStatus.currentFrame += gameStatus.endFrame < gameStatus.currentFrame ? Math.floor((gameStatus.endFrame - gameStatus.currentFrame) * gameStatus.easing) : Math.ceil((gameStatus.endFrame - gameStatus.currentFrame) * gameStatus.easing);
                $images.src = "img/sequence/sequence_" + render.getNormalFrame() + ".png";
                render.printResult();
            }
            else {
                window.clearInterval(gameStatus.ticker);
                gameStatus.ticker = 0;
                $status.innerHTML = "Stopped";
                if ( gameStatus.checkResult ) {
                    if ( !gameStatus.ready ) {
                        gameStatus.won = model.checkWon();
                    }
                    model.checkResult();
                }
            }
        },
        getNormalFrame: function() {
            var c = gameStatus.currentFrame % gameStatus.totalFrame;
            if (c < 0) {
                c += gameStatus.totalFrame;
            }
            return c + 1;
        },
        printResult: function() {
            gameStatus.currentLap = Math.abs(gameStatus.currentFrame / gameStatus.totalFrame).toFixed(1);
            render.playSound();
            $visibleFrame.innerHTML = gameStatus.currentFrame;
            $targetFrame.innerHTML = gameStatus.endFrame;
            $lapCounter.innerHTML = gameStatus.currentLap;
        },
        playSound: function() {
            if ( gameStatus.currentLap >= gameStatus.soundLap ) {
                turnSnd.currentTime = 0;
                turnSnd.play();
                gameStatus.soundLap += 0.5;
            }
        },
        resetAngle: function(frame) {
            gameStatus.endFrame = gameStatus.totalFrame * Math.round(gameStatus.endFrame / gameStatus.totalFrame) + frame;
            render.refresh();
        }
    };


    // This module handles interaction between user and game; Updates "gameStatus.endFrame" value and fires render function
    //
    var controls = {

        start: function(e) {
            console.log("Controls start");
            e.preventDefault();

            //We use this value manuel dragging
            gameStatus.startPositionManuel = !! e.touches ? e.touches[0].pageX : e.pageX;

            //Card holding animations
            animations.holdAnimations();

            //In mobile we lock background when flipping card
            if ( background.model.sceneProperties.interactionWay === "touch" ) {
                background.model.currentInteractSpecs.X = background.model.sceneProperties.sceneWidth / 2;
                background.model.currentInteractSpecs.Y = background.model.sceneProperties.sceneHeight / 2;
                background.model.sceneAnimator();
                background.view.ready = false;
            }

            //Do not show results for manuel dragging
            gameStatus.checkResult = false;

            document.addEventListener( gameStatus.handlers[1], controls.track );
            document.addEventListener( gameStatus.handlers[2], controls.track );
        },

        track: function(e) {
            // Touchmove or mousemove
            if ( e.type === gameStatus.handlers[1] ) {

                e.preventDefault();

                gameStatus.endPosition = !! e.touches ? e.touches[0].pageX : e.pageX;

                if ( gameStatus.ready ) {

                    gameStatus.ready = false;
                    gameStatus.startPosition = !! e.touches ? e.touches[0].pageX : e.pageX;

                    setTimeout(function () {
                        controls.measureDistance();
                    }, 100);
                }

                gameStatus.endFrame = gameStatus.endPosition - gameStatus.startPositionManuel;
                render.refresh();

            } else { // Touchend or mouseup

                console.log("Released");
                render.resetAngle(gameStatus.startFrame);
                gameStatus.checkResult = true;
                background.view.ready = true;

                $game.removeEventListener( gameStatus.handlers[0], controls.start );
                document.removeEventListener( gameStatus.handlers[1], controls.track );
                document.removeEventListener( gameStatus.handlers[2], controls.track );
            }
        },

        measureDistance: function () {
            if ( Math.abs(gameStatus.endPosition - gameStatus.startPosition) > 100 ) {

                $game.removeEventListener( gameStatus.handlers[0], controls.start );
                document.removeEventListener( gameStatus.handlers[1], controls.track );
                document.removeEventListener( gameStatus.handlers[2], controls.track );

                window.clearInterval(gameStatus.ticker);
                gameStatus.ticker = 0;
                gameStatus.checkResult = true;

                $lapCounter.classList.remove("hide");
                $flipImg.classList.remove("show");

                setTimeout(function () {
                    background.view.ready = true;
                }, 500);

                gameStatus.endFrame = gameStatus.currentFrame + Math.ceil( gameStatus.speedMultipler * ( gameStatus.endPosition - gameStatus.startPosition ) );
                render.refresh();

                return;
            }
            gameStatus.ready = true;
        }
    };


    // This module handles some business data
    //
    var model = {

        checkResult: function() {
            // If you dont won, this is last step
            if ( gameStatus.ready ) {

                console.log("App is ready");

                $readyImg.classList.add("show");
                $flipImg.classList.remove("show");
                $lapCounter.classList.add("hide");
                $lapCounter.classList.remove("youlose");

                gameStatus.soundLap = 0.5;
                gameStatus.endFrame = gameStatus.startFrame;
                gameStatus.currentFrame = gameStatus.startFrame;

                $visibleFrame.innerHTML = gameStatus.currentFrame;
                $targetFrame.innerHTML = gameStatus.endFrame;

                $game.addEventListener(gameStatus.handlers[0], controls.start);
                return;
            }

            // You dont won, we are going to reset everything and make game ready
            if ( !gameStatus.won ) {

                $status.innerHTML = "Try again";
                $lapCounter.classList.add("youlose");

                setTimeout(function () {
                    gameStatus.ready = true;
                    $lapCounter.classList.add("hide");
                    render.resetAngle(gameStatus.startFrame);
                }, 1500);
                return;
            }

            // You already won, gift will appear. (END OF GAME)
            if ( gameStatus.gift ) {
                animations.endAnimations();
                return;
            }

            // You stopped at winning numbers, we are going to reset card and show your gift.
            if ( gameStatus.won ) {

                gameStatus.gift = true;

                $status.innerHTML = "You won!";
                $lapCounter.classList.add("youwin");

                setTimeout(function () {
                    $lapCounter.classList.add("hide");
                    render.resetAngle(0);
                }, 1500);
            }
        },

        checkWon: function() {
            return gameStatus.targetNumbers.indexOf(gameStatus.currentLap) > -1;
        },

        setWinningNumbers: function(x, y) {
            var numbers = [];
            while (x <= y) {
                var target = x.toFixed(1);
                numbers.push(target);
                x += .1;
            }
            return numbers;
        }
    };


    // This module handles some predefined animations
    //
    var animations = {

        // Fires when user hold the card
        holdAnimations: function() {
            $flipImg.classList.add("show");
            $readyImg.classList.remove("show");
            readySnd.currentTime = 0;
            readySnd.play();
            render.resetAngle(0);
        },

        // Fires when user won
        endAnimations: function () {
            $status.innerHTML = "Here is your gift!";

            $gameArea.insertAdjacentHTML("afterbegin", '<img src="img/gift.png" class="gift">');
            gameStatus.giftOnDom = document.querySelector(".gift");

            setTimeout(function(){
                resizeGift();
                gameStatus.giftOnDom.classList.add("show");
                $wonImage.classList.remove("hide");
                $wonImage.classList.add("show");
            },150);
        }
    };


    // This module handles resizing function
    //
    var resize = function () {

        clearTimeout(window.resizeGame);
        window.resizeGame = setTimeout(function(){

            //Rezise game wrapper
            var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
                height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            $gameArea.style.height = height + "px";
            $gameArea.style.width = width + "px";

            //Resize top of cards
            $game.style.top = ($floor.offsetTop - ( ($gameLayer.offsetHeight - $gameArea.offsetHeight) / 2) ) - ($game.offsetHeight * 0.77) + "px";

            //Resize gift
            if ( gameStatus.gift ) {
                resizeGift();
            }

        }, 150);
    };

    var resizeGift = function () {
        gameStatus.giftOnDom.style.height = $images.offsetHeight + $images.offsetHeight * 0.6 + "px";
        gameStatus.giftOnDom.style.left = (gameStatus.giftOnDom.offsetWidth / -2) + $game.offsetLeft + "px";
        gameStatus.giftOnDom.style.top = $game.offsetTop + $game.offsetHeight - gameStatus.giftOnDom.offsetHeight + (gameStatus.giftOnDom.offsetHeight * 0.12) + "px";
    };

    window.addEventListener("resize", resize, true);



    // This module handles debugging
    //
    var $debug_hidebutton = document.querySelector("#debug #hideBtn"),
        $debug_winbutton = document.querySelector("#debug #winBtn"),
        $debug_lowerlimit = document.querySelector("#lowerLimit"),
        $debug_upperlimit = document.querySelector("#upperLimit"),
        $data = document.querySelector("#data");

    $debug_hidebutton.addEventListener("click", function() {
        $data.classList.toggle("hide");
    });

    $debug_winbutton.addEventListener("click", function() {
        if (gameStatus.ready && !gameStatus.gift) {

            $game.removeEventListener( gameStatus.handlers[0], controls.start );
            document.removeEventListener( gameStatus.handlers[1], controls.track );
            document.removeEventListener( gameStatus.handlers[2], controls.track );

            $lapCounter.classList.remove("hide");
            $readyImg.classList.remove("show");
            gameStatus.ready = false;
            gameStatus.checkResult = true;
            gameStatus.endFrame = gameStatus.targetNumbers[0] * (gameStatus.totalFrame);
            render.refresh();
        }
    });


    //SET NUMBERS
    gameStatus.targetNumbers = model.setWinningNumbers(7,7.5);
    $debug_lowerlimit.innerHTML = gameStatus.targetNumbers[0];
    $debug_upperlimit.innerHTML = gameStatus.targetNumbers[gameStatus.targetNumbers.length - 1];

    //LAUNCH APP
    gameInitializer.start();
};