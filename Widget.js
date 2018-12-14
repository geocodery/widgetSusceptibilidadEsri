define(['dojo/_base/declare', 
        'jimu/BaseWidget',
        "jimu/portalUrlUtils",
        "jimu/portalUtils",
        "dojo",
        "dojo/query",
        "dojo/dom-class",
        'dojo/on',
        'dojo/dom-attr',
        'dojo/_base/Color',
        "dojo/_base/lang",
        "esri/toolbars/draw",
        "esri/graphic",
        "esri/InfoTemplate",
        "esri/layers/GraphicsLayer",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/tasks/Geoprocessor",
        "esri/layers/ImageParameters",
        "esri/tasks/JobInfo",
        "esri/geometry/geometryEngine",
        "esri/geometry/scaleUtils",
        "esri/request",
        "dijit/registry",
        "dijit/form/Button"],
function(declare, 
         BaseWidget,
         portalUrlUtils, 
         portalUtils, 
         dojo,
         query,
         domClass,
         on,
         domAttr,
         Color,
         lang,
         Draw,
         Graphic,
         InfoTemplate,
         GraphicsLayer,
         SimpleMarkerSymbol,
         SimpleLineSymbol,
         SimpleFillSymbol,
         Geoprocessor,
         ImageParameters,
         JobInfo,
         geometryEngine,
         scaleUtils,
         esriRequest,
         registry) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {

    // Custom widget code goes here

    baseClass: 'hazards',
    shapetype: null,
    rowSelect: null,
    extHz: null,
    // this property is set by the framework when widget is loaded.
    // name: 'hazards',
    // add additional properties here

    //methods to communication with app container:
    postCreate: function() {
      this.inherited(arguments);
      self = this;
      console.log('hazards::postCreate');
    },

    startup: function() {
      this.inherited(arguments);
      self._createToolbarHz();
      var gp = null;
      var hzcont = null;
      var arr = null;
      var general = null;
      var factor = null;
      var summaryTable = null;
    },

    onOpen: function(){
      console.log('hazards::onOpen');
      var panel = this.getPanel();
      panel.position.height = 740;
      panel.setPosition(panel.position);
      panel.panelManager.normalizePanel(panel);
    },

    // onClose: function(){
    //   console.log('hazards::onClose');
    // },

    // onMinimize: function(){
    //   console.log('hazards::onMinimize');
    // },

    // onMaximize: function(){
    //   console.log('hazards::onMaximize');
    // },

    // onSignIn: function(credential){
    //   console.log('hazards::onSignIn', credential);
    // },

    // onSignOut: function(){
    //   console.log('hazards::onSignOut');
    // }

    // onPositionChange: function(){
    //   console.log('hazards::onPositionChange');
    // },

    // resize: function(){
    //   console.log('hazards::resize');
    // }

    //methods to communication between widgets:
    _onchangetab: function(evt){
        var currentid = evt.target.id;
        self._activeclass("method", currentid);
        if (currentid == "drawbtnHz"){
            self._activeclass("tabcontentHz", "drawHz");
        }else{
            self._activeclass("tabcontentHz", "featureHz")
            tb.deactivate();           
        }
    },

    _activeclass: function(offclass, onid){
        var tab = query("." + offclass);
        for(i = 0; i < tab.length; i++){
            domClass.remove(tab[i].id, "active");
        }
        domClass.add(onid, "active");
    },

    _changueColorToolbar: function(onid){
        var array = ['point', 'polyline', 'polygon'];
        for (i=0; i < array.length; i++){
            if (array[i] != onid){
                dojo.byId(array[i]).style.backgroundColor = "#ddd";
            }
            else{
                dojo.byId(onid).style.backgroundColor = "#808080";
            }
        }

    },

    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    // ::SE DA LA CREACION DEL TOOLBAR DE DIBUJO::

    _createToolbarHz: function(){
        // Se crea el objeto de la clase Draw
        tb = new Draw(_viewerMap);
        // Se indica que al finalizar el grafico se ejecute
        // la funcion _addToMapHz
        tb.on("draw-end", self._addToMapHz);
    },


    // Se ejecuta al hacer click en los botones de dibujo
    _activateToolHz: function(evt){
        // Elimina el layer anteriormente generado (si existe)
        _viewerMap.graphics.clear();
        // Captura el id del boton clickeado
        var tool = evt.target.id.toUpperCase();

        self._changueColorToolbar(tool.toLowerCase())

        // Si el boton utilizado no es "Delete features"
        if (tool != "ERASE"){
            // Se activa la herramienta de dibujo
            tb.activate(Draw[tool]);
            // Se deshabilitan los Popup
            _viewerMap.setInfoWindowOnClick(false);
        }else{
            console.log("Delete fetures")
        }   
    },

    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    // Agregar grafico al mapa y s ejecuta el geoproceso
    // Se ejecuta cuando la realizacion del grafico ha finalizado
    _addToMapHz: function(evt){
        // Se crea la variable para aplicar las simbologias
        var symbolHz;
        var area = 0;
        // Se desactiva la herramienta de dibujo
        tb.deactivate();
        // Se activan los Popup
        _viewerMap.setInfoWindowOnClick(true);
        // Se aplican las distintas simbologias en funcion
        // al tipo de geometria seleccionada
        switch (evt.geometry.type){
            case "point":
                symbolHz = new SimpleMarkerSymbol();
                self.shapetype = "esriGeometryPoint";
                //self._activeclass("drawHz", "point")
                break;
            case "polyline":
                symbolHz = new SimpleLineSymbol();
                self.shapetype = "esriGeometryPolyline";
                //self._activeclass("drawHz", "polyline")
                break;
            case "polygon":
                symbolHz = new SimpleFillSymbol();
                self.shapetype = "esriGeometryPolygon";
                //self._activeclass("drawHz", "polygon")
                break;
            case "erase":
                // Erase no es un tipo de geometria por tanto
                // se deja en valor nulo 
                symbolHz = null
            }
        // Se crea el objeto de la clase Graphic
        var graphic = new Graphic(evt.geometry, symbolHz);
        if (evt.geometry.type == "polygon"){
            area = geometryEngine.geodesicArea(geometryEngine.simplify(graphic.geometry), "hectares");
        } 
        // Parametro de entrada para ejecutar servicio
        var inputGeom = JSON.stringify(graphic.geometry).replace(/['"]+/g, '\'');
        console.log(inputGeom);

        if (area <= 100000){
            self._gprun(inputGeom, self._getSelectedOption('queryentity'));
        }else{
            alert("El grafico realizado supera el valor de area permitido")
        };
    },

    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

    // Obtener variable de consulta
    _getSelectedOption: function(idobj){
        var res = dojo.byId(idobj);
        var selected = res.options[res.selectedIndex].value;
        return selected;
    },

    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    // Activar o descativar contenedores
    _activeContainers: function(onid, value){
        if(value){
            // Agrega una subclase a un elemento
            domClass.add(onid, "active");
        }else {
            // Remueve una subclase de un elemento
            domClass.remove(onid, "active")
        }
    },

    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    // Ejecutar geoproceso
    _gprun: function(inputjson, queryentity){
        hzcont = 0
        self._activeContainers("tbHz", false);
        self._activeContainers("loaderHz", true);
        self._activeContainers("downloadHz", false);
        self._activeContainers("errorHz", false);
        self._activeContainers("summaryContent", false);
        // Se crea el objeto de la clase Geoprocesor
        // Se le agrega el parametro de la url del servicio
        gp = new Geoprocessor(self.config.serviceUrl);
        // Se establecen los parametros del geoproceso
        var params = {'input_json': inputjson, 'query_entity': queryentity};
        // se ejecuta el geoproceso
        gp.submitJob(params, self._completeCallback, self._statusCallback);
    },

    // Obtener los mensajes durante la ejecucion del proceso
    _statusCallback: function(JobInfo){
        console.log(JobInfo.jobStatus);
    },


    // Funcion a ejecutar cuando el proceso finaliza
    _completeCallback: function(JobInfo){
        // Si el proceso obtiene un error
        if(JobInfo.jobStatus=="esriJobFailed"){
            // Se desactiva el icono de procesamiento
            self._activeContainers("loaderHz", false);
            // Se activa el icono de error
            self._activeContainers("errorHz", true);
        }else{  
            gp.getResultData(JobInfo.jobId, "output_feature", self._displayResult);
            gp.getResultData(JobInfo.jobId, "output_zip", self._downloadZip);
            gp.getResultData(JobInfo.jobId, "output_json", self._populateTable);
            gp.getResultData(JobInfo.jobId, "output_summary", self._statistics);
            gp.getResultData(JobInfo.jobId, "output_extent", self._extentProcess);


            // Se desactiva el icono de procesamiento
            self._activeContainers("loaderHz", false);
            self._activeContainers("tbHz", true);
            // Se activa el boton de descarga
            self._activeContainers("downloadHz", true);
            self._activeContainers("summaryContent", true);
        }
    },

    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    // Simbologia de resultados

    _symbologyOutput: function(level, geometry){
        var colorLevel
        var symbolprop
        if (level == "Muy Alto"){
            colorLevel = new Color([255, 0, 0, 0.8]);
        }else if(level == "Alto"){
            colorLevel = new Color([255, 128, 0, 0.8]);
        }else if(level == "Medio"){
            colorLevel = new Color([255, 255, 0, 0.8]);
        }else if(level == "Bajo"){
            colorLevel = new Color([139, 209, 0, 0.8]);
        }else if(level == "Muy Bajo"){
            colorLevel = new Color([56, 168, 0, 0.8]);
        }

        if (geometry == "esriGeometryPoint"){
            symbolprop = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 
                                                24, SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL), 
                                                colorLevel);
        }else if(geometry == "esriGeometryPolyline"){
            symbolprop = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, colorLevel, 7);
        }else if(geometry == "esriGeometryPolygon"){
            symbolprop = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, 
                                              SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL), 
                                              colorLevel);
        }
        return symbolprop
    },


    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

    _displayResult: function(result){
        var level = null
        var features = result.value.features;
        var fnt = self._generateSymbolFontLabel();
        var halosymb = self._generateSymbolHaloLabel();
        for(i = 0; i < features.length; i++){
            var feature = features[i];
            var symb = self._symbologyOutput(feature.attributes.DESCRIP, self.shapetype);
            var infoTemplate = new InfoTemplate("Attributes", "${*}");
            feature.setSymbol(symb);
            feature.setInfoTemplate(infoTemplate);
            var attr = feature.attributes.FID
            if (self.shapetype != "esriGeometryPoint"){
                var pt = feature.geometry.getExtent().getCenter();
                _viewerMap.graphics.add(feature);
                var label = new Graphic(pt, self._generateLabels(attr, fnt))
                var halo = new Graphic(pt, halosymb)   
                _viewerMap.graphics.add(halo);
                _viewerMap.graphics.add(label);              
            }else{
                _viewerMap.graphics.add(feature);
            }
        }
    },

    _setExtent: function(ext){
      _viewerMap.setExtent(ext, true);
    },


    _generateSymbolFontLabel: function(){
        var fnt = new esri.symbol.Font();
        fnt.family = "Arial";
        fnt.size = "12px";
        return fnt
    },

    _generateSymbolHaloLabel: function(){
        var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([40, 62, 86]), 1);
        var sms = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 24, sls, new Color([128, 128, 128, 0.8]));
        return sms;
    },


    _generateLabels: function(fieldShow, fnt){
        var textsym = new esri.symbol.TextSymbol(fieldShow, fnt, "#ffffff");
        textsym.setOffset(0, -4);
        return textsym;
    },


    // Se agrega la ruta de desacarga
    _downloadZip: function(outputFile){
       // Se obtiene la url del resultado del geoproceso
       var url = outputFile.value.url;
       // Se agrega la url a la etiqueta html <a>
       domAttr.set(dojo.byId("downloadzip"), 'href', url);
    },

    _populateTable: function(outputJson){
        arr = outputJson.value;
        tag = dojo.byId("containerRowsHz")
        tag.innerHTML = ""
        setTimeout(function(){
            tag.innerHTML = summaryTable;
        }, 1000);

        on(dojo.byId("filtro"), "change", self._filterTable)
    },

    _zoomRow: function(evt){
      // Obteniendo el valor del elemento padre
      if (self.rowSelect){
        self.rowSelect.symbol.outline.style = "none";
        _viewerMap.graphics.refresh()
      };
      if (self.shapetype == "esriGeometryPolygon"){
          var idrow = evt.target.parentElement.getElementsByTagName("td")[0].innerHTML;
          var graphicFilter = _viewerMap.graphics.graphics.filter(function(elm){if (elm.attributes){return elm;}});
          self.rowSelect = graphicFilter[parseInt(idrow) - 1]
          self.rowSelect.symbol.outline.style = "solid";
          self.rowSelect.symbol.outline.width = "4";
          self.rowSelect.symbol.outline.color = new Color([0, 219, 231]);
          _viewerMap.graphics.refresh() 
      }

      var ext = evt.target.parentElement.getAttribute("value").split(" ");
      // Creando el objeto de la clase Extent
      var extent = new esri.geometry.Extent({
        "xmin": ext[0],
        "ymin": ext[1],
        "xmax": ext[2],
        "ymax": ext[3],
        "spatialReference": {"wkid": 4326}
      });
      // Reconfigurando el extent en función del registro seleccionado
      _viewerMap.setExtent(extent, true);
    },


    _filterTable: function(evt){
        var rows = "";
        var rowsContainer = dojo.byId("containerRowsHz");
        if (arr){
            if (self.rowSelect){
                self.rowSelect.symbol.outline.style = "none";
                _viewerMap.graphics.refresh()
            }
            var op = self._getSelectedOption(evt.target.id);
            console.log(op)
            self._setupstatistics(op);
            rowsContainer.innerHTML = "";
            if (op == "All"){
                rowsContainer.innerHTML = summaryTable;
            } else {
                for(i = 0; i < arr.length; i++){
                    // Obteniendo las clases a utilizar en cada registro
                    var  classLe = arr[i].PELIGRO.replace(" ", '');
                    if (classLe == op){
                        // Asignando valores a cada registro
                        // Utilizando  Templates Literals
                        idhz = `<td>${arr[i].ID}</td>`
                        pehz = `<td>${arr[i].PELIGRO}</td>`
                        prhz = `<td><progress value="${arr[i].PORCENT}" max="100" id="barHz"></td>`
                        lehz = `<td class="${classLe}"></td>`
                        // Construyendo todo el registro
                        rows = rows +  `<tr class="rowsHz" id="${classLe}" value="${arr[i].ACERCAR}">${idhz}${pehz}${prhz}${lehz}</tr>`
                    }
                }
                rowsContainer.innerHTML = rows;
                var rowsClass = query(".rowsHz");
                // Asignando la funcion de zoom a cada registro
                for(i = 0; i < rowsClass.length; i++){
                    on(rowsClass[i], "click", self._zoomRow);
                }
            }
        }else{
            console.log("Add graphics")
        }
    },


    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

    _statistics: function(summary){
        factor = {
            "esriGeometryPolygon": [0.0001, "HA"],
            "esriGeometryPolyline": [0.001, "km"],
            "esriGeometryPoint": ["", ""],
        };
        var dimVal;
        general = summary.value;
        self._getinnerhtmlSummary(general);
        var idhz = "all"
        var k = factor[self.shapetype][0];
        var u = factor[self.shapetype][1];

        if (general[idhz]["dimen"] != "-"){
            dimVal = (general[idhz]["dimen"]*k).toFixed(2);
        }else{
            dimVal = general[idhz]["dimen"];
        }

        var dimen = `<li>Dimension: ${dimVal} ${u}</li>`;
        var porce =  `<li>Porcentaje: 100 %</li>`; 
        dojo.byId("summaryContent").innerHTML = `<ul>${dimen}${porce}</ul>`;
    },


    _setupstatistics: function(nivel){
        var dimVal; var porVal;
        var getid = {
            "All": "all",  
            "MuyBajo": "Muy Bajo",
            "Bajo": "Bajo",
            "Medio": "Medio",
            "Alto": "Alto",
            "MuyAlto": "Muy Alto"
        }

        var k = factor[self.shapetype][0];
        var u = factor[self.shapetype][1];
        var idhz = getid[nivel];

        if (nivel == "All"){
            porVal = 100;
        };

        if (self.shapetype != "esriGeometryPoint"){
            dimVal = (general[idhz]["dimen"]*k).toFixed(2);
            porVal = general[idhz]["porce"].toFixed(2);             
        } else {
            dimVal = general[idhz]["dimen"];
            porVal = general[idhz]["porce"];            
        };

        var nivelitem = `<li>Nivel: ${idhz}</li>`;
        var dimenitem = `<li>Dimension: ${dimVal} ${u}</li>`;
        var porceitem =  `<li>Porcentaje: ${porVal} %</li>`; 

        if (nivel == "All") {
            var info = `<ul>${dimenitem}${porceitem}</ul>`;
        }else{
            var info = `<ul>${nivelitem}${dimenitem}${porceitem}</ul>`;    
        };

        dojo.byId("summaryContent").innerHTML = info;
    },

    _extentProcess: function(extent){
        var ext_tmp = extent.value.replace(/u/g, '');
        ext_tmp = ext_tmp.replace(/'/g, "\"");
        self.extHz = new esri.geometry.Extent(JSON.parse(ext_tmp))
        self._setExtent(self.extHz);
        on(dojo.byId("extentgeometry"), "click", self._zoomExtent);
    },


    _zoomExtent: function(evt){
        self._setExtent(self.extHz);
    },


    _getinnerhtmlSummary: function(arrVal){
        var sorted = {
            'Muy Bajo': 1,
            'Bajo': 2,
            'Medio': 3,
            'Alto': 4,
            'Muy Alto': 5
        }
        summaryTable = ""
        for(var key in sorted){
            var  classLe = key.replace(" ", '');
            var percent = arrVal[key]["porce"]
            if (percent != "-"){
                percent = percent.toFixed(2)
            } else {
                if (arr[0]["PELIGRO"] == key){
                    percent = arr[0]["PORCENT"]
                }
            }
            var idhz = `<td>${sorted[key]}</td>`
            var pehz = `<td>${key}</td>`
            var prhz = `<td><progress value="${percent}" max="100" id="barHz"></td>`
            var lehz = `<td class="${classLe}"></td>`   
            // Construyendo todo el registro
            summaryTable = summaryTable +  `<tr class="rowsHz" id="${classLe}">${idhz}${pehz}${prhz}${lehz}</tr>`     
        }
    },

    //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    // Cargar informacion local || shapefile en .zip
    // SE OBTIENE LA URL DE LA ORGANIZACION
    _getUrl: function(){
      var p = portalUtils.getPortal(self.appConfig.portalUrl);
      return portalUrlUtils.getSharingUrl(p.portalUrl);
    },
 

    // CAMBIAR EL NOMBRE DEL ZIP INPUT, IE: INTERNET EXPLORER | CHROME
    _getBaseFileNameHz: function(fileName) {
        var baseFileName = fileName.replace(/\\/g, '/');
        baseFileName = baseFileName.substr(baseFileName.lastIndexOf('/') + 1);
        baseFileName = baseFileName.replace(".zip", "");
        return baseFileName;
    },


    // COMPARA SI LA EXTENSION INGRESADA ES LA EXTENSION REQUERIDA POR EL PROCESO
    _endsWithHz: function(sv, sfx) {
        return (sv.indexOf(sfx, (sv.length - sfx.length)) !== -1);
    },


    _errorFormatHz: function(){
      self._activeContainers("formatedError", true);
    },

    // OBTENER LA INFORMACION DEL ARCHIVO INGRESADO
    _getFileInfoHz: function() {
      // Creando el objeto que contiene las caracteristicas del file de entrada
      var info = {
        ok: false,
        fileName: null,
        fileType: "shapefile"
      };

      // Obteniendo el elemento html que almacena la información de ingreso
      var fileobj = self.fileInputHz;
      
      // Obteniendo el nombre del file de entrada
      info.fileName = fileobj.value;

      // Identificando si el file de entrada es un archivo de formato .zip
      if (self._endsWithHz(info.fileName, ".zip")){
        info.ok = true;
      }

      // Actualizando el flag que define si el proceso se ejecuta o envia un error
      if (info.ok){
        info.baseFileName = self._getBaseFileNameHz(info.fileName);
      }else{
        self._errorFormatHz();
      }
      return info;
    },

    // INICIAR LA CARGA DEL .ZIP INPUT
    _onUploadHz: function(){
      var fileInfo = self._getFileInfoHz();
      if (fileInfo.ok){
        _viewerMap.graphics.clear();
        self._generateFeaturesHz(fileInfo);
      }
    },


    // ENVIA EL ARCHIVO INGRESADO Y DEVUELVE EL FEATURE EN FORMATO JSON
    _generateFeaturesHz: function(fileInfo) {
      //dojo.query(".contentLoader_em").style("display", "block");

      // Construyendo la url para generar la informacion ingresada en el mapa
      var url_hz = self._getUrl() + "/content/features/generate";

      // Atributos del objeto que define los parametros del objeto a graficar dentro del mapa
      // sistema de referencia
      // nombre
      // Limite de almacenaje del archivo
      // Limite de dimension del json devuelto
      var params = {
        "name": fileInfo.baseFileName,
        "targetSR": _viewerMap.spatialReference,
        "maxRecordCount": 3000,
        "enforceInputFileSizeLimit": true,
        "enforceOutputJsonSizeLimit": true
      }

      var extent = scaleUtils.getExtentForScale(_viewerMap, 40000);
      var resolution = extent.getWidth() / _viewerMap.width;
      params.generalize = true;
      params.maxAllowableOffset = resolution;
      params.reducePrecision = true;
      params.numberOfDigitsAfterDecimal = 0;

      var content = {
        'f': "json",
        'fileType': fileInfo.fileType,
        'publishParameters': JSON.stringify(params)
      };

      esriRequest({
        url: url_hz,
        content: content,
        form: dojo.byId("uploadFormHz"),
        handleAs: "json",
        callbackParamName: "callback",
        load: lang.hitch(self, function(response){
          if (response.error) {
            self._errorHandlerHz(response.error);
            return;
          }
          var layerName = response.featureCollection.layers[0].layerDefinition.name;
          self._addFeaturesHz(response.featureCollection);
        }),
        error: lang.hitch(self, self._errorHandlerHz)
      });
    },


    // AGREGA EL SHAPEFILE DE ENTRADA EN LA VISUALIZACION DEL MAPA
    _addFeaturesHz: function(featureCollection) {
        self.shapetype = featureCollection.layers[0].featureSet.geometryType;
        var inputGeom_tmp = featureCollection.layers[0].featureSet.features[0].geometry
        var inputGeom = JSON.stringify(inputGeom_tmp).replace(/['"]+/g, '\'');
        self._gprun(inputGeom, self._getSelectedOption('queryentity'));
    },


    // MUESTRA EL ERROR DEL LADO DEL CLIENTE
    _errorHandlerHz: function(error){
        alert(error);
    },

  });

});
