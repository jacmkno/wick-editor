/*
 * Copyright 2018 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react';
import './_editor.scss';

import 'bootstrap/dist/css/bootstrap.min.css';
import HTML5Backend from 'react-dnd-html5-backend'
import { DragDropContextProvider } from "react-dnd";
import 'react-reflex/styles.css'
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex'
import { throttle } from 'underscore';
import { HotKeys } from 'react-hotkeys';

import DockedPanel from './Panels/DockedPanel/DockedPanel';
import Canvas from './Panels/Canvas/Canvas';
import Inspector from './Panels/Inspector/Inspector';
import MenuBar from './Panels/MenuBar/MenuBar';
import Timeline from './Panels/Timeline/Timeline';
import Toolbox from './Panels/Toolbox/Toolbox';
import AssetLibrary from './Panels/AssetLibrary/AssetLibrary';
import CodeEditor from './Panels/CodeEditor/CodeEditor';
import ModalHandler from './Modals/ModalHandler/ModalHandler';
import HotKeyInterface from './hotKeyMap';

class Editor extends Component {

  constructor () {
    super();

    // Temporary asset generation function.
    function genAssets() {
        let assets = [];
        let items = ["asset", "img", "sound", "clip", "button"]

        for (var i=0; i< 1; i++) {
          let a = {};
          a.name = "Asset " + i;
          a.uuid = "" + i;
          a.type = items[Math.floor(Math.random()*items.length)]
          assets.push(a);
        }
        return assets;
    }

    this.state = {
      project: null,
      onionSkinEnabled: false,
      onionSkinSeekForwards: 1,
      onionSkinSeekBackwards: 1,
      activeTool: 'cursor',
      toolSettings: {
        fillColor: '#ffaabb',
        strokeColor: '#000',
        strokeWidth: 1,
        brushSize: 10,
        brushSmoothing: 0.9,
        brushSmoothness: 10,
        borderRadius: 0,
        pressureEnabled: false,
      },
      selectionProperties: {
        content: "path",
        canvasUUIDs: [],
        timelineUUIDs: [],
        name: "selectedObject",
        x:0,
        y:0,
        width: 100,
        height: 100,
        scaleW: 1,
        scaleH: 1,
        rotation: 0,
        opacity: 1,
        strokeWidth: 1,
        fillColor: '#ffaa66',
        strokeColor: '#666',
        frameLength: 0,
        sound: "needs a uuid",
      },
      assets: genAssets(),
      openModalName: null,
      previewPlaying: false,
    };

    // Milliseconds to throttle resize events by.
    this.resizeThrottleAmount = 3;

    // define hotkeys
    this.hotKeyInterface = new HotKeyInterface(this);

    this.tickLoopIntervalID = null;

    this.updateProject = this.updateProject.bind(this);
    this.updateOnionSkinSettings = this.updateOnionSkinSettings.bind(this);
    this.updateToolSettings = this.updateToolSettings.bind(this);
    this.updateSelectionProperties = this.updateSelectionProperties.bind(this);
    this.updateAssets = this.updateAssets.bind(this);
    this.openModal = this.openModal.bind(this);
    this.activateTool = this.activateTool.bind(this);
    this.togglePreviewPlaying = this.togglePreviewPlaying.bind(this);
    this.startTickLoop = this.startTickLoop.bind(this);
    this.stopTickLoop = this.stopTickLoop.bind(this);
    this.refocusEditor = this.refocusEditor.bind(this);
    this.resizeProps = {
      onStopResize: throttle(this.onStopResize.bind(this), this.resizeThrottleAmount),
      onResize: throttle(this.onResize.bind(this), this.resizeThrottleAmount)
    };

    // Bind window resizes to editor resize events.
    window.addEventListener("resize", this.resizeProps.onResize);
  }

  componentWillMount () {
    let project = new window.Wick.Project();
    this.setState({project: project});
  }

  componentDidMount () {
    this.refocusEditor();
  }

  componentDidUpdate (prevProps, prevState) {
    if(this.state.previewPlaying && !prevState.previewPlaying) {
      this.startTickLoop();
    }

    if(!this.state.previewPlaying && prevState.previewPlaying) {
      this.stopTickLoop();
    }
  }

  onResize (e) {
    window.WickCanvas.resize();
    window.AnimationTimeline.resize();
  }

  onStopResize = ({domElement, component}) => {

  }

  openModal (name) {
    if (this.state.openModalName !== name) {
      this.setState({
        openModalName: name,
      });
    }
    this.refocusEditor();
  }

  activateTool (toolName) {
    this.setState({
      activeTool: toolName
    });
  }

  togglePreviewPlaying () {
    this.setState(prevState => ({
      previewPlaying: !prevState.previewPlaying,
    }));
  }

  startTickLoop () {
    this.tickLoopIntervalID = setInterval(() => {
      var nextProject = this.state.project;
      nextProject.tick();
      this.updateProject(nextProject);
    }, 1000 / this.state.project.framerate);
  }

  stopTickLoop () {
    clearInterval(this.tickLoopIntervalID);
  }

  refocusEditor () {
    window.document.getElementById('hotkeys-container').focus();
  }

  updateProject (nextProject) {
    this.setState(prevState => ({
      project: nextProject,
    }));
  }

  updateOnionSkinSettings (enabled, seekBackwards, seekForwards) {
    this.setState(prevState => ({
      onionSkinEnabled: enabled,
      onionSkinSeekBackwards: seekBackwards,
      onionSkinSeekForwards: seekForwards,
    }));
  }

  updateToolSettings (newToolSettings) {
    let updatedToolSettings = this.state.toolSettings;

    // Update only provided settings.
    Object.keys(newToolSettings).forEach((key) =>
      updatedToolSettings[key] = newToolSettings[key]
    )

    this.setState({
      toolSettings: updatedToolSettings,
    });
  }

  updateSelectionProperties (newSelectionProperties) {
    let updatedSelectionProperties = this.state.selectionProperties;

    // Update only provided settings.
    Object.keys(newSelectionProperties).forEach((key) =>
      updatedSelectionProperties[key] = newSelectionProperties[key]
    );

    // Only timeline objects OR canvas objects can be selected at once.
    if(newSelectionProperties.canvasUUIDs) {
      updatedSelectionProperties.timelineUUIDs = [];
    } else if (newSelectionProperties.timelineUUIDs) {
      updatedSelectionProperties.canvasUUIDs = [];
    }

    this.setState({
      selectionProperties: updatedSelectionProperties,
    });

  }

  updateAssets (updatedAssets) {
    console.log("Updating Assets", updatedAssets);
  }

  render () {
      return (
        <DragDropContextProvider backend={HTML5Backend}>
          <HotKeys
            keyMap={this.hotKeyInterface.getKeyMap()}
            handlers={this.hotKeyInterface.getHandlers()}
            style={{width:"100%", height:"100%"}}
            id='hotkeys-container'>
            <div id="editor">
              <div id="menu-bar-container">
                <ModalHandler openModal={this.openModal}
                              openModalName={this.state.openModalName}
                              project={this.state.project}
                              updateProject={this.updateProject} />
                {/* Header */}
                <DockedPanel>
                  <MenuBar openModal={this.openModal} projectName={this.state.project.name}/>
                </DockedPanel>
              </div>
              <div id="editor-body">
                <div id="tool-box-container">
                  <DockedPanel>
                    <Toolbox
                      activeTool={this.state.activeTool}
                      toolSettings={this.state.toolSettings}
                      updateToolSettings={this.updateToolSettings}
                      fillColor={this.state.fillColor}
                      strokeColor={this.state.strokeColor}
                      activateTool={this.activateTool}
                    />
                  </DockedPanel>
                </div>
                <div id="flexible-container">
                  {/* TODO:The 'key' update below is a hack to force ReflexContainers to re render on window resize and should be replaced ASAP */}
                  <ReflexContainer orientation="vertical">
                    {/* Middle Panel */}
                    <ReflexElement {...this.resizeProps}>
                      <ReflexContainer orientation="horizontal">
                        {/* Timeline */}
                        <ReflexElement size={100} {...this.resizeProps}>
                          <DockedPanel>
                            <Timeline
                              project={this.state.project}
                              updateProject={this.updateProject}
                              updateOnionSkinSettings={this.updateOnionSkinSettings}
                              onionSkinEnabled={this.state.onionSkinEnabled}
                              onionSkinSeekBackwards={this.state.onionSkinSeekBackwards}
                              onionSkinSeekForwards={this.state.onionSkinSeekForwards}
                              selectionProperties={this.state.selectionProperties}
                              updateSelectionProperties={this.updateSelectionProperties}
                            />
                          </DockedPanel>
                        </ReflexElement>
                        <ReflexSplitter {...this.resizeProps}/>
                        {/* Canvas */}
                        <ReflexElement {...this.resizeProps}>
                          <DockedPanel>
                            <Canvas
                              project={this.state.project}
                              toolSettings={this.state.toolSettings}
                              updateProject={this.updateProject}
                              activeTool={this.state.activeTool}
                              onionSkinEnabled={this.state.onionSkinEnabled}
                              onionSkinSeekBackwards={this.state.onionSkinSeekBackwards}
                              onionSkinSeekForwards={this.state.onionSkinSeekForwards}
                              selectionProperties={this.state.selectionProperties}
                              updateSelectionProperties={this.updateSelectionProperties}
                            />
                          </DockedPanel>
                        </ReflexElement>
                        <ReflexSplitter {...this.resizeProps}/>
                        {/* Code Editor */}
                        <ReflexElement size={1} {...this.resizeProps}>
                          <DockedPanel><CodeEditor /></DockedPanel>
                        </ReflexElement>
                      </ReflexContainer>
                    </ReflexElement>

                    <ReflexSplitter {...this.resizeProps}/>

                  {/* Right Sidebar */}
                    <ReflexElement
                      size={150}
                      maxSize={250} minSize={150}
                      {...this.resizeProps}>
                      <ReflexContainer orientation="horizontal">
                        {/* Inspector */}
                        <ReflexElement propagateDimensions={true} minSize={200} {...this.resizeProps}>
                          <DockedPanel>
                            <Inspector
                              activeTool={this.state.activeTool}
                              toolSettings={this.state.toolSettings}
                              updateToolSettings={this.updateToolSettings}
                              selectionProperties={this.state.selectionProperties}
                              updateSelectionProperties={this.updateSelectionProperties}
                            />
                          </DockedPanel>
                        </ReflexElement>

                        <ReflexSplitter {...this.resizeProps}/>

                        {/* Asset Library */}
                        <ReflexElement { ...this.resizeProps}>
                          <DockedPanel>
                            <AssetLibrary
                              assets={this.state.assets}
                              updateAssets={this.updateAssets}/></DockedPanel>
                        </ReflexElement>
                      </ReflexContainer>
                    </ReflexElement>
                  </ReflexContainer>
                </div>
              </div>
            </div>
          </HotKeys>
        </DragDropContextProvider>
      )
  }
}

export default Editor
