"use strict";
exports.__esModule = true;
var angular_core_1 = require("./types/angular_core");
var util_1 = require("./util");
var tree_traversal_1 = require("./tree-traversal");
var tree_view_builder_1 = require("./tree-view-builder");
/**
 * This class encapsulates the same logic used by the Angular Ivy renderer to determine what the next view is to be checked.
 *
 * Internally, Angular manages a property 'lView' which points to the current view to be checked. Unfortunately, it's impossible
 * to reference this property by using a runtime dependency. We do need this know which view is currently being checked to link
 * the correct lView with the correct template function execution. By linking this info we can figure out which component is checked
 * and which one is not.
 *
 * The class exposes the predictedNextLView property which is the predicted lView to be checked. By calling the getNextLView function
 * the pointer is set to the next predicted one. This is done by mimicking the tree traversal that Angular does internally. Every time this
 * traversal is updated, this file will need to be as well!
 *
 * Call the resetState function to reset the initial state between different loops.
 */
var LViewStateManager = /** @class */ (function () {
    function LViewStateManager() {
    }
    /**
     * Function will change the pointer to the predictedNextLView parameter to the one Angular called the template function for.
     *
     * EVERY call will change the pointer to the next lView. Meaning, every call will traverse the tree from where it left of and will
     * try to find the next one
     *
     * @param treeViewItem
     * @param rootLView
     */
    LViewStateManager.prototype.getNextLView = function (treeViewItem, rootLView) {
        var _this = this;
        // If there is no current predictedLView it MUST be the current iteration
        if (!this.predictedNextLView) {
            var rootTreeViewItem = tree_view_builder_1.createInitialTreeViewState(rootLView, true);
            this.treeViewBuilder = new tree_view_builder_1.TreeViewBuilder();
            this.treeViewBuilder.addTreeViewItem(rootTreeViewItem);
            this.predictedNextLView = rootLView;
            return;
        }
        // If no treeViewItem was passed, take the last one we were working with
        if (!treeViewItem) {
            treeViewItem = this.treeViewBuilder.currentTreeViewItem;
        }
        // Loop over all the dynamicEmbeddedViews
        if (!treeViewItem.dynamicEmbeddedViewsChecked) {
            // When a dynamic embedded view is found
            var whenDynamicEmbeddedViewFound = function (dynamicLView, lastViewRef, currentViewRefIndex, nextLContainer) {
                // if it was the last viewRef for that LContainer, we need to update the pointer so the next loop doesn't revisit it
                if (lastViewRef) {
                    treeViewItem.nextCurrent = nextLContainer;
                }
                else {
                    // If not, we need to update the index of the current viewRef so we don't revisit that one again
                    treeViewItem.currentViewRefIndex = currentViewRefIndex + 1;
                }
                // We go deeper into the dynamicEmbeddedView found to find components
                _this.getNextLView(tree_view_builder_1.createInitialTreeViewState(dynamicLView, false, treeViewItem));
            };
            // Call the tree traversal for dynamicEmbeddedViews, exit the loop whenever we hit something. We only want to visit the
            // first node and continue to the next on the next traversal.
            var foundADynamicEmbeddedView = tree_traversal_1.loopDynamicEmbeddedViews({
                lView: treeViewItem.lView,
                work: whenDynamicEmbeddedViewFound,
                nextCurrentLContainer: treeViewItem.nextCurrent,
                nextViewRefIndex: treeViewItem.currentViewRefIndex,
                exitLoopPrematurely: true
            });
            // If a dynamic view was found, we need to stop looping, if not, we need to check the current lView's child components
            if (foundADynamicEmbeddedView) {
                return;
            }
            // Label this so we don't accidentally loop over all the dynamic embedded views again
            treeViewItem.dynamicEmbeddedViewsChecked = true;
        }
        // Check the child components
        var components = treeViewItem.lView[angular_core_1.TVIEW].components;
        if (!components || treeViewItem.currentIndex >= components.length) {
            if (!treeViewItem.isRoot) {
                this.getNextLView(treeViewItem.parent);
                return;
            }
            return;
        }
        // Pick the one based on the index
        var potentialLView = treeViewItem.lView[components[treeViewItem.currentIndex]];
        // Check if it is not the root and if the component will be checked during this CD cycle, find the next
        if (!treeViewItem.isRoot && util_1.shouldLViewBeChecked(potentialLView)) {
            treeViewItem.currentIndex++;
            this.getNextLView(treeViewItem);
            return;
        }
        // Found the component that will be checked next
        this.predictedNextLView =
            treeViewItem.lView[components[treeViewItem.currentIndex]] ||
                treeViewItem.lView;
        // Up the index so we don't go over it again
        treeViewItem.currentIndex++;
        // Create a new treeViewItem entry and add it as a child to the current one
        var childTreeViewItem = tree_view_builder_1.createInitialTreeViewState(this.predictedNextLView, false, treeViewItem);
        this.treeViewBuilder.addTreeViewItem(childTreeViewItem, tree_traversal_1.getRealParent(treeViewItem));
    };
    LViewStateManager.prototype.resetState = function () {
        this.predictedNextLView = null;
    };
    LViewStateManager.prototype.getTree = function () {
        return this.treeViewBuilder.rootTreeViewItem;
    };
    return LViewStateManager;
}());
exports.LViewStateManager = LViewStateManager;
//# sourceMappingURL=l-view-state-manager.js.map