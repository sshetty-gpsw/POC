module.exports = function(grunt) {

    //Make sure this is a valid api token
    var hockeyApiToken = "d65e397820934c0093ee52ba00fcd92e";
    
  function createRelLinkReplacerFunction(replaceExt, withExt, prefix) {
    // callers should NOT pass a '.' char as part of the replacement
    // file extension -- if there is a non-empty extension we'll add 
    // the dot now.
    if (withExt) {
      withExt = '.' + withExt;
    }

    prefix = prefix || '';

    // this pattern is meant to match RELATIVE urls paths
    // to files with the given extension in THIS folder ONLY.
    var replacePattern = new RegExp("^([\\w-]+)\\." + replaceExt + "(.*)$");

    return function($) {
      $("[href*='." + replaceExt + "']").each(function() {
        var self = $(this);

        var url = self.attr('href');
        var match = url.match(replacePattern);
        if (match) {
          url = prefix + match[1] + withExt + match[2];
          self.attr('href', url);
        }
      });
    }
  }    

  //Function to set href's attribute to "_self" for gopro.com domain
  function setTargetForHref($){
      $("a").each(function(){
          var self = $(this);
          var url = self.attr('href');
          if (typeof url != 'undefined'){
              var isGoProDomainUrl = url.includes("gopro.com");
              if (isGoProDomainUrl){
                  self.attr('target', "_self");
              }
          }          
      });    
  }
    
  //articles image src url needs to be changed as per the evniroment
  function setImgSrcToSalesforceUrls($, environment){
      var imageMapperJson = grunt.file.readJSON('imageMapping.json');
      $('img').each(function(){
          var imageElement = $(this);
          var imageSrc = imageElement.attr('src');
          var imageMapDictForSrc = imageMapperJson[imageSrc];
          if(typeof imageMapDictForSrc != 'undefined'){
              imageElement.attr('src', imageMapDictForSrc[environment]);
          }
      });
  }

  // article URLs must be absolute per DPPD-79.
  function getSalesforcePrefixPath() {
    var target = grunt.option('target') || 'production';
    switch (target) {
      case 'production': return 'https://developer.gopro.com/s/article/';
      case 'sandbox': return 'https://dev1-gopro.cs2.force.com/Developer/s/article/';
      default: throw Error('invalid target option: ' + target);
    }
  }

  // String <- Array of different app versions 
  // getBuildUrl: Parses through the appversions to find the required app version
  // Returns: The corresponding build url
  function getBuildUrl(appVersions){
      //MetaData file consists of required parameters
      var releaseMetaData = grunt.file.readJSON('buildtoolMetaData.json');
      for(var i=0; i<appVersions.length; i++){
          if(appVersions[i].version === releaseMetaData.wsdk_version){
              return appVersions[i].build_url;
          }
      }
  }

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
      
    clean: {
        build:['../build'],
        options:{
            force:true
        }
   },

    marked: {
      options: {
        sanitize: false
      },
      local: {
        files: [{
          expand: true,
          cwd: '../Documents/Markdown',
          ext: '.html',
          src: '**/*.md',
          dest: '../build/local/Documents',
        }]
      },
      salesforce: {
        files: [{
          expand: true,
          cwd: '../Documents/Markdown',
          ext: '.html',
          src: '**/*.md',
          dest: '../build/salesforce/Documents',
        }]
      }
    },

    dom_munger: {
      local: {
        src: ['../build/local/**/*.html'],
        options: {
          callback: function($) {
            // replace .md file extensions with .html
            var linkFn = createRelLinkReplacerFunction("md", "html");
            setImgSrcToSalesforceUrls($, "local")
            linkFn($);
          }
        }
      },
      salesforce: {
        src: ['../build/salesforce/**/*.html'],
        options: {
          callback: function($) {
            // remove initial h1 tag -- Salesforce displays this
            // separate from article content
            $('h1').first().remove();

            // remove .html file extensions from relative hrefs
            // also prepend the urls with Salesforce's URL.
            var linkFn = createRelLinkReplacerFunction("md", "html", getSalesforcePrefixPath());
            linkFn($);
            setTargetForHref($);
            var target = grunt.option('target') || 'production';
            switch (target) {
              case 'production': setImgSrcToSalesforceUrls($, "salesforceProduction");
                    break;
              case 'sandbox': setImgSrcToSalesforceUrls($, "salesforceSandbox");
                    break;
              default: throw Error('invalid target option: ' + target);
                    break;
            }
            
          }
        }
      }
    },

    copy: {
      local: {
        files: [{
          expand: true,
          cwd: '../Documents/Markdown',
          src: ['**/*' ,'!**/*.md'],
          dest: '../build/local/documents'
        }]
      },
      salesforce: {
        files: [{
          expand: true,
          cwd: '../Documents/Markdown',
          src: ['**/*' ,'!**/*.md'],
          dest: '../build/salesforce/documents'
        }]
      }
    },
      
    batch: {
      docs_to_pdf_local: {
        options: {
          cmd: function(file) {
            var dir = process.cwd();
            dir = dir.replace(dir.split("/").pop(),"");
            var destRelPath = file.dest.replace("../","");
            var srcPath = '"' + process.cwd() + '/' + file.src + '"';
            var destPath = '"' + dir + destRelPath + '"';
            // applescript version
             return ['./docx-to-pdf.applescript', srcPath, destPath].join(' ');
          }
        },
        files: [{
          expand: true,
          cwd: '../Documents/Word',
          src: '**/*.docx',
          dest: '../build/local/Downloads/gopro-sdk-ios',
          ext: '.pdf'
        }]
      },
      docs_to_pdf_salesforce: {
        options: {
          cmd: function(file) {
            var dir = process.cwd();
            dir = dir.replace(dir.split("/").pop(),"");
            var destRelPath = file.dest.replace("../","");
            var srcPath = '"' + process.cwd() + '/' + file.src + '"';
            var destPath = '"' + dir + destRelPath + '"';
            // applescript version
             return ['./docx-to-pdf.applescript', srcPath, destPath].join(' ');           
          }
        },
        files: [{
          expand: true,
          cwd: '../Documents/Word',
          src: '**/*.docx',
          dest: '../build/salesforce/Downloads/gopro-sdk-ios',
          ext: '.pdf'
        }]
      }
    },
      
    http: {
        fetch_build_url_salesforce: {
          options: {
            //https://rink.hockeyapp.net/api/2/apps/[AppId]/app_versions?include_build_urls=true
            url: 'https://rink.hockeyapp.net/api/2/apps/70bb6954ee4d4af7974127fc8bcd93f9/app_versions?include_build_urls=true',
            headers:{"X-HockeyAppToken" : hockeyApiToken},
            callback: function(error,response, body){
                var appVersions = JSON.parse(body);
                grunt.config.set('curl.fetch_build_salesforce.src.url', getBuildUrl(appVersions.app_versions));
            }
          }
        }
    },
    curl:{
      fetch_build_salesforce:{
        src: {
          url: '', //dynamically generated in 'http:fetch_build_url' task
          method: 'get'
        },
        dest: '../build/salesforce/Downloads/gopro-sdk-ios/wsdk.zip'
      } 
    },
    exec: {
      zip_downloads_folder: {
          cmd : 'osascript ./zip.applescript ' + grunt.file.readJSON('buildtoolMetaData.json').gpdp_version
      }
    }
  });

  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-marked');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-dom-munger');
  grunt.loadNpmTasks('grunt-batch');
  grunt.loadNpmTasks('grunt-http');
  grunt.loadNpmTasks('grunt-curl');
    
  grunt.registerTask('local', ['clean', 'marked:local', 'copy:local','dom_munger:local', 'batch:docs_to_pdf_local']);
  grunt.registerTask('salesforce', ['clean', 'marked:salesforce', 'copy:salesforce', 'dom_munger:salesforce', 'batch:docs_to_pdf_salesforce', 'http:fetch_build_url_salesforce', 'curl:fetch_build_salesforce']); 
  grunt.registerTask('default', ['salesforce']);
  grunt.registerTask('package', ['exec:zip_downloads_folder']);

};

//,  