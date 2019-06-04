/**
 * @author inojeon http://inojeon.github.io
 */

			if ( WEBGL.isWebGLAvailable() === false ) {
				document.body.appendChild( WEBGL.getWebGLErrorMessage() );
			}
			var container;
			var perpCamera, orthoCamera, renderer, lut, pointLight, controls;
			var mesh, sprite;
			var scene, uiScene;
			var params	= {
						colorMap: 'rainbow',
						numberOfColors: 256
					};
			var geo, gui;


			gui = new dat.GUI();
				gui.add( params, 'colorMap', [ 'rainbow', 'cooltowarm', 'blackbody', 'grayscale' ] ).onChange( function (d) {
					geo.params.colorMap = d;
					params.colorMap = d;
					geo.setColor();
					render();
				} );


			var loader = new THREE.FileLoader();
			loader.load( "models/V_2060.vtk" , function ( data ) {
//			loader.load( "vtk2/V_100.vtk" , function ( data ) {
				geo = new VTKLoader(data, 'container');
				console.log(geo);


			});



			class VTKLoader {
				constructor(data, containerId) {
					this.init(data, containerId);
				}
				init(data, containerId){
					container = document.getElementById( containerId );
					scene = new THREE.Scene();
					scene.background = new THREE.Color( 0xffffff );
					uiScene = new THREE.Scene();
				
					lut = new THREE.Lut( "rainbow", 256 );

					var width = window.innerWidth;
					var height = window.innerHeight;
					perpCamera = new THREE.PerspectiveCamera( 60, width / height, 1, 100 );
//					perpCamera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 10000);
					perpCamera.position.set( 0, 0, 10 );


					// light
					var dirLight = new THREE.DirectionalLight(0xffffff);
					dirLight.position.set(200, 200, 1000).normalize();
					perpCamera.add(dirLight);
					perpCamera.add(dirLight.target);

					scene.add( perpCamera );
					orthoCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 1, 2 );
					orthoCamera.position.set( 0.5, 0, 1 );
					sprite = new THREE.Sprite( new THREE.SpriteMaterial( {
						map: new THREE.CanvasTexture( lut.createCanvas() )
					} ) );
					sprite.scale.x = 0.1;
					uiScene.add( sprite );
					mesh = new THREE.Mesh( undefined, new THREE.MeshLambertMaterial( {
						side: THREE.DoubleSide,
						color: 0xF5F5F5,
						vertexColors: THREE.VertexColors
					} ) );
					scene.add( mesh );

					pointLight = new THREE.PointLight( 0xffffff, 1 );
					perpCamera.add( pointLight );
					renderer = new THREE.WebGLRenderer( { antialias: true } );
					renderer.autoClear = false;
					renderer.setClearColor(0xffffff, 1);
					renderer.setPixelRatio( window.devicePixelRatio );
					renderer.setSize( width, height );
					container.appendChild( renderer.domElement );
					window.addEventListener( 'resize', onWindowResize, false );
					controls = new THREE.OrbitControls( perpCamera, renderer.domElement );
					this.vtkLoader(data);
					render();
					controls.addEventListener( 'change', render );
				}

		
				vtkLoader(data) {
					//step 1 parsing vtk file
					const parsedData = this.parseVTK(data);
					//step 2 set positions, setIndex
					this.geometry = new THREE.BufferGeometry();
					this.geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( parsedData.indices ), 1 ) );
					this.geometry.addAttribute( 'position' , new THREE.Float32BufferAttribute( parsedData.positions , 3 ));
					
					this.geometry.center();
					this.geometry.computeVertexNormals();
					this.geometry.normalizeNormals();


					parsedData.pointDatas.forEach(element => {
						this.geometry.addAttribute(element.name , new THREE.Float32BufferAttribute( element.point , 1 ));
					});

					this.params	= {
						colorMap: 'rainbow',
						name: parsedData.pointDatas[0].name,
						min: parsedData.pointDatas[0].min,
						max: parsedData.pointDatas[0].max,
						numberOfColors: 256
					};

					//step 3 Set color
//					lut = new THREE.Lut(this.params.colorMap, this.params.numberOfColors);

					this.setColor();
					mesh.geometry = this.geometry;
					render();

				}
				setColor() {
					const scalar = this.geometry.attributes[this.params.name].array;

					//step 2. set lut color (convert scalar to color)
					if (typeof this.geometry.attributes.color === 'undefined') {
						const colorCount = 3*this.geometry.attributes.position.count;						
						this.geometry.addAttribute( 'color' , new THREE.BufferAttribute( new Float32Array( colorCount, 1 ).fill(1) , 3 ));
					}
					const colors = this.geometry.attributes.color;
				

					lut.setColorMap( this.params.colorMap, this.params.numberOfColors );
//					lut.setMax( 30 );
//					lut.setMin( -85 );
					lut.setMax( this.params.max );
					lut.setMin( this.params.min );

					for (let j = 0; j < scalar.length; j++) {
						const color = lut.getColor( scalar[j] );
						colors.setXYZ( j, color.r, color.g, color.b );	
					}
					colors.needsUpdate = true;
					var map = sprite.material.map;
					lut.updateCanvas( map.image );
					map.needsUpdate = true;

					console.log("finish");
				}

				parseVTK(data) {
					const line = data.split("\n").map(x => x.trim());
					var dataObj = {positions: [], indices: [], pointDatas:[] };

					for (var i =0; i < line.length; i++) {
						if (line[i].split(/\s+/)[0].toLowerCase().match(/^points/) ) {
							const numberOfPoints = parseInt(line[i].split(/\s+/)[1]);
							i =1+i;

							for (let k = 0; k < numberOfPoints; k++) {
								const vertices = line[i+k].split(/\s+/);
								vertices.map( x => 	dataObj.positions.push(parseFloat(x)) ); 
							}
							i =i+numberOfPoints;
							dataObj.numberOfPoints = numberOfPoints;
						} 
						if (line[i].split(/\s+/)[0].toLowerCase().match(/^cells/) ) {
							const numberOfCells = parseInt(line[i].split(/\s+/)[1]);
							i =1+i;
							for (let k = 0; k < numberOfCells; k++) {
								const cellsData = line[i+k].split(/\s+/).map( x => parseInt(x));
								if ( cellsData[0] >= 3 ) 			// if numVertices is 4, push  0,1,2  0,2,3 
									for ( var j = 2; j < cellsData[0]; ++ j )
										dataObj.indices.push(cellsData[1], cellsData[j], cellsData[j+1]);					
							}
							i =i+numberOfCells;
							dataObj.numberOfCells = numberOfCells;
//							console.log(dataObj.indices);
						}
						if (line[i].split(/\s+/)[0].toLowerCase().match(/^cells_types/) ) {
							const numberOfCellstypes = parseFloat(line[i].split(/\s+/)[1]);
							i =i+numberOfCellstypes;
						}
						if (line[i].split(/\s+/)[0].toLowerCase().match(/^point_data/) ) {
							const numberOfPointData = parseFloat(line[i].split(/\s+/)[1]);
							while (i+numberOfPointData < line.length) {
								const pointData = {};
								i=i+1;
								pointData.name = line[i].split(/\s+/)[1];
								i=i+2;
								pointData.point = [];
								for (let k = 0; k < numberOfPointData; k++) {
									pointData.point.push(parseFloat(line[i+k]));
								}
								[ pointData.min, pointData.max ] = d3.extent(pointData.point);
								dataObj.pointDatas.push(pointData);
								i=i+numberOfPointData-1;
							}
						}
					}
					return dataObj;
					console.log("finish vtkLoader");
				}
			}


			function render() {
				renderer.clear();
				renderer.render( scene, perpCamera );
				renderer.render( uiScene, orthoCamera );
			}
			function onWindowResize() {
				var width = window.innerWidth;
				var height = window.innerHeight;
				perpCamera.aspect = width / height;
				perpCamera.updateProjectionMatrix();
				renderer.setSize( width, height );
				render();
			}
