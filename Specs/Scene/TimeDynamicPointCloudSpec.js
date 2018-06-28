defineSuite([
        'Scene/TimeDynamicPointCloud',
        'Core/Cartesian3',
        'Core/Clock',
        'Core/ClockStep',
        'Core/combine',
        'Core/defaultValue',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Core/HeadingPitchRoll',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix4',
        'Core/TimeIntervalCollection',
        'Core/Transforms',
        'Scene/Cesium3DTileStyle',
        'Scene/ClippingPlane',
        'Scene/ClippingPlaneCollection',
        'Scene/ShadowMode',
        'Specs/createCanvas',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        TimeDynamicPointCloud,
        Cartesian3,
        Clock,
        ClockStep,
        combine,
        defaultValue,
        defined,
        HeadingPitchRange,
        HeadingPitchRoll,
        JulianDate,
        CesiumMath,
        Matrix4,
        TimeIntervalCollection,
        Transforms,
        Cesium3DTileStyle,
        ClippingPlane,
        ClippingPlaneCollection,
        ShadowMode,
        createCanvas,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;

    var clock = new Clock({
        clockStep : ClockStep.TICK_DEPENDENT,
        shouldAnimate : true
    });

    var dates = [
        JulianDate.fromIso8601('2018-07-19T15:18:00Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:00.5Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:01Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:01.5Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:02Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:02.5Z')
    ];

    var transforms = [
        Matrix4.fromColumnMajorArray([0.968635634376879,0.24848542777253735,0,0,-0.15986460794399626,0.6231776137472074,0.7655670897127491,0,0.190232265775849,-0.7415555636019701,0.6433560687121489,0,1215012.8828876738,-4736313.051199594,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.968634888916237,0.24848833367832227,0,0,-0.1598664774761181,0.6231771341505793,0.7655670897127493,0,0.19023449044168372,-0.7415549929018358,0.6433560687121489,0,1215027.0918213597,-4736309.406139632,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.9686341434468771,0.24849123958187078,0,0,-0.1598683470068011,0.6231766545483426,0.7655670897127493,0,0.19023671510580634,-0.7415544221950274,0.6433560687121489,0,1215041.3007441103,-4736305.761037043,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.9686333979687994,0.24849414548318288,0,0,-0.15987021653604533,0.6231761749404972,0.7655670897127491,0,0.19023893976821685,-0.7415538514815451,0.6433560687121489,0,1215055.5096559257,-4736302.115891827,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.9686326524820043,0.2484970513822586,0,0,-0.15987208606385075,0.6231756953270434,0.7655670897127492,0,0.19024116442891523,-0.7415532807613887,0.6433560687121489,0,1215069.7185568055,-4736298.470703985,4081605.22126042,1])
    ];

    function createIntervals(useTransforms) {
        var folderName = useTransforms ?
            'Data/Cesium3DTiles/PointCloud/PointCloudTimeDynamicWithTransform/' :
            'Data/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/';

        var uris = [];
        for (var i = 0; i < 5; ++i) {
            uris.push(folderName + i + '.pnts');
        }

        function dataCallback(interval, index) {
            return {
                uri : uris[index],
                transform : useTransforms ? transforms[index] : undefined
            };
        }

        return TimeIntervalCollection.fromJulianDateArray({
            julianDates : dates,
            dataCallback : dataCallback
        });
    }

    function createTimeDynamicPointCloud(options) {
        options = defaultValue(options, {});
        var useTransforms = defaultValue(options.useTransforms, false);
        options.intervals = createIntervals(useTransforms);
        options.clock = clock;
        if (!defined(options.style)) {
            options.style = new Cesium3DTileStyle({
                color : 'color("red")',
                pointSize : 10
            });
        }
        return scene.primitives.add(new TimeDynamicPointCloud(options));
    }

    var center = new Cartesian3(1215012.8828876738, -4736313.051199594, 4081605.22126042);

    function zoomTo(center) {
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
    }

    function loadFrame(pointCloud, index) {
        index = defaultValue(index, 0);
        goToFrame(index);
        return pollToPromise(function() {
            scene.renderForSpecs();
            var frame = pointCloud._frames[index];
            var ready = defined(frame) && frame.ready;
            if (ready) {
                scene.renderForSpecs();
            }
            return ready;
        });
    }

    function getLoadFrameFunction(pointCloud, index) {
        return function() {
            return loadFrame(pointCloud, index);
        };
    }

    function loadFrames(pointCloud, indexes) {
        var length = indexes.length;
        var promise = getLoadFrameFunction(pointCloud, indexes[0])();
        for (var i = 1; i < length; ++i) {
            promise = promise.then(getLoadFrameFunction(pointCloud, indexes[i]));
        }
        return promise.then(function() {
            goToFrame(indexes[0]);
        });
    }

    function loadAllFrames(pointCloud) {
        return loadFrames(pointCloud, [0, 1, 2, 3, 4]);
    }

    function goToFrame(index) {
        clock.currentTime = dates[index];
        clock.multiplier = 0.0;
    }

    function initializeScene() {
        zoomTo(center);
        goToFrame(0);
    }

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        initializeScene();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws if options.clock is undefined', function() {
        var intervals = createIntervals();
        expect(function(){
            return new TimeDynamicPointCloud({
                intervals : intervals
            });
        }).toThrowDeveloperError();
    });

    it('throws if options.intervals is undefined', function() {
        expect(function(){
            return new TimeDynamicPointCloud({
                clock : clock
            });
        }).toThrowDeveloperError();
    });

    it('renders the first frame', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            expect(scene).toRender([255, 0, 0, 255]);
        });
    });

    it('sets show', function() {
        var pointCloud = createTimeDynamicPointCloud();

        return loadFrame(pointCloud).then(function() {
            expect(scene).toRender([255, 0, 0, 255]);
            pointCloud.show = false;
            expect(scene).toRender([0, 0, 0, 255]);
        });
    });

    it('sets model matrix', function() {
        var translation = new Cartesian3(10000, 2000, 100);
        var modelMatrix = Matrix4.fromTranslation(translation);
        var newCenter = Cartesian3.add(center, translation, new Cartesian3());
        var pointCloud = createTimeDynamicPointCloud({
            modelMatrix : modelMatrix
        });
        return loadFrame(pointCloud).then(function() {
            expect(scene).toRender([0, 0, 0, 255]); // Out of view
            zoomTo(newCenter);
            expect(scene).toRender([255, 0, 0, 255]);
            pointCloud.modelMatrix = Matrix4.IDENTITY;
            expect(scene).toRender([0, 0, 0, 255]); // Out of view
            zoomTo(center);
            expect(scene).toRender([255, 0, 0, 255]);
        });
    });

    it('sets shadows', function() {
        var pointCloud = createTimeDynamicPointCloud({
            shadows : ShadowMode.DISABLED
        });
        return loadFrame(pointCloud).then(function() {
            scene.renderForSpecs();
            expect(scene.frameState.commandList[0].castShadows).toBe(false);
            expect(scene.frameState.commandList[0].receiveShadows).toBe(false);
            pointCloud.shadows = ShadowMode.ENABLED;
            scene.renderForSpecs();
            expect(scene.frameState.commandList[0].castShadows).toBe(true);
            expect(scene.frameState.commandList[0].receiveShadows).toBe(true);
        });
    });

    it('honors maximumMemoryUsage by unloading all frames not currently being loaded or rendered', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadAllFrames(pointCloud).then(function() {
            var singleFrameMemoryUsage = 33000;
            var frames = pointCloud._frames;
            var framesLength = frames.length;
            expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage * framesLength);
            pointCloud.maximumMemoryUsage = 0;

            // Expect all frames except the current frame to be undefined
            scene.renderForSpecs();
            expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage);
            expect(frames[0].ready).toBe(true);
            for (var i = 1; i < length; ++i) {
                expect(frames[i]).toBeUndefined();
            }

            // The loading frame and last rendered frame are not unloaded
            goToFrame(1);
            scene.renderForSpecs();
            expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage);
            expect(frames[0].ready).toBe(true);
            expect(frames[1].ready).toBe(false);

            // The loaded frame is the only one loaded
            return loadFrame(pointCloud, 1).then(function() {
                expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage);
                expect(frames[0]).toBeUndefined();
                expect(frames[1].ready).toBe(true);
            });
        });
    });

    it('enables attenuation and eye dome lighting', function() {
        var oldScene = scene;
        scene = createScene({
            canvas : createCanvas(10, 10)
        });
        initializeScene();

        var pointCloud = createTimeDynamicPointCloud({
            pointCloudShading : {
                attenuation : true,
                eyeDomeLighting : false
            },
            style : new Cesium3DTileStyle()
        });

        return loadFrame(pointCloud).then(function() {
            var attenuationPixelCount;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                attenuationPixelCount = pixelCount;
            });

            // Disable attenuation and expect less pixels to be drawn
            pointCloud.pointCloudShading.attenuation = false;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toBeLessThan(attenuationPixelCount);
            });

            // Enable eye dome lighting
            expect(scene.frameState.commandList.length).toBe(1);
            pointCloud.pointCloudShading.attenuation = true;
            pointCloud.pointCloudShading.eyeDomeLighting = true;
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(3); // Added 2 EDL commands

            scene.destroyForSpecs();
            scene = oldScene;
        });
    });

    it('sets style', function() {
        var pointCloud = createTimeDynamicPointCloud({
            style : new Cesium3DTileStyle({
                color : 'color("blue")',
                pointSize : 10
            })
        });
        return loadAllFrames(pointCloud).then(function() {
            expect(scene).toRender([0, 0, 255, 255]);
            pointCloud.style = new Cesium3DTileStyle({
                color : 'color("lime")',
                pointSize : 10
            });
            expect(scene).toRender([0, 255, 0, 255]);
            goToFrame(1); // Also check that the style is updated for the next frame
            expect(scene).toRender([0, 255, 0, 255]);
        });
    });

    it('make style dirty', function() {
        var pointCloud = createTimeDynamicPointCloud({
            style : new Cesium3DTileStyle({
                color : 'color("blue")',
                pointSize : 10
            })
        });
        return loadAllFrames(pointCloud).then(function() {
            expect(scene).toRender([0, 0, 255, 255]);
            pointCloud.style.color = 'color("lime")';
            pointCloud.makeStyleDirty();
            expect(scene).toRender([0, 255, 0, 255]);
            goToFrame(1); // Also check that the style is updated for the next frame
            expect(scene).toRender([0, 255, 0, 255]);
        });
    });

    it('sets clipping planes', function() {
        var modelMatrix = new Transforms.headingPitchRollToFixedFrame(center, new HeadingPitchRoll(0, 0, 0));
        var clippingPlanesX = new ClippingPlaneCollection({
            modelMatrix : modelMatrix,
            planes : [
                new ClippingPlane(Cartesian3.UNIT_X, 0.0)
            ]
        });
        var clippingPlanesY = new ClippingPlaneCollection({
            modelMatrix : modelMatrix,
            planes : [
                new ClippingPlane(Cartesian3.UNIT_Y, 0.0)
            ]
        });

        var pointCloud = createTimeDynamicPointCloud({
            clippingPlanes : clippingPlanesX
        });
        return loadAllFrames(pointCloud).then(function() {
            // Go to unclipped area (right half)
            scene.camera.moveRight(0.1);
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);

            // Go to clipped area (left half)
            scene.camera.moveLeft(0.2);
            goToFrame(0);
            expect(scene).toRender([0, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([0, 0, 0, 255]);

            // Same area no longer clipped. Responds to clipping planes updates.
            pointCloud.clippingPlanes.enabled = false;
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);

            // Sets a new clipping plane that uses a different axis
            // Go to unclipped area (bottom left)
            pointCloud.clippingPlanes = clippingPlanesY;
            scene.camera.moveRight(0.2);
            scene.camera.moveUp(0.1);
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);

            // Go to clipped area (bottom right)
            scene.camera.moveDown(0.2);
            goToFrame(0);
            expect(scene).toRender([0, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([0, 0, 0, 255]);
        });
    });

    it('works with frame transforms', function() {
        var pointCloud = createTimeDynamicPointCloud({
            useTransforms : true
        });
        return loadAllFrames(pointCloud).then(function() {
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            // The transform shifted the point cloud to the right
            goToFrame(1);
            expect(scene).toRender([0, 0, 0, 255]);
            scene.camera.moveRight(10.0);
            expect(scene).toRender([255, 0, 0, 255]);
        });
    });

    it('does not render during morph', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBeGreaterThan(0);
            scene.morphToColumbusView(1.0);
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(0);
            scene.morphTo3D(0.0);
        });
    });

    it('picks', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            pointCloud.show = false;
            expect(scene).toPickPrimitive(undefined);
            pointCloud.show = true;
            expect(scene).toPickPrimitive(pointCloud);
        });
    });

    it('does not render if current time is out of range', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            // Before
            clock.currentTime = JulianDate.addSeconds(dates[0], -10.0, new JulianDate());
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(0);
            // During
            clock.currentTime = dates[0];
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(1);
            // After
            clock.currentTime = JulianDate.addSeconds(dates[5], 10.0, new JulianDate());
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(0);
        });
    });

    it('destroys', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadAllFrames(pointCloud).then(function() {
            scene.primitives.remove(pointCloud);
            expect(pointCloud.isDestroyed()).toEqual(true);
            expect(pointCloud.totalMemoryUsageInBytes).toBe(0);
        });
    });

}, 'WebGL');
