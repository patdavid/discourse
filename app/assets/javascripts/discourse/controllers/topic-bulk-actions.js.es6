import ModalFunctionality from 'discourse/mixins/modal-functionality';

const _buttons = [];

const alwaysTrue = () => true;

function addBulkButton(action, key, icon, buttonVisible) {
  _buttons.push({
    action,
    label: `topics.bulk.${key}`,
    icon,
    buttonVisible: buttonVisible || alwaysTrue
  });
}

// Default buttons
addBulkButton('showChangeCategory', 'change_category', 'pencil');
addBulkButton('deleteTopics', 'delete', 'trash');
addBulkButton('closeTopics', 'close_topics', 'lock');
addBulkButton('archiveTopics', 'archive_topics', 'folder');
addBulkButton('showNotificationLevel', 'notification_level', 'circle-o');
addBulkButton('resetRead', 'reset_read', 'backward');
addBulkButton('unlistTopics', 'unlist_topics', 'eye-slash', topics => {
  return topics.some(t => t.visible);
});
addBulkButton('relistTopics', 'relist_topics', 'eye', topics => {
  return topics.some(t => !t.visible);
});

addBulkButton('showTagTopics', 'change_tags', 'tag');
addBulkButton('showAppendTagTopics', 'append_tags', 'tag');

// Modal for performing bulk actions on topics
export default Ember.Controller.extend(ModalFunctionality, {
  tags: null,

  emptyTags: Ember.computed.empty('tags'),
  categoryId: Ember.computed.alias('model.category.id'),

  onShow() {
    const topics = this.get('model.topics');
    // const relistButtonIndex = _buttons.findIndex(b => b.action === 'relistTopics');

    this.set('buttons', _buttons.filter(b => b.buttonVisible(topics)));
    this.set('modal.modalClass', 'topic-bulk-actions-modal small');
    this.send('changeBulkTemplate', 'modal/bulk-actions-buttons');
  },

  perform(operation) {
    this.set('loading', true);

    const topics = this.get('model.topics');
    return Discourse.Topic.bulkOperation(topics, operation).then(result => {
      this.set('loading', false);
      if (result && result.topic_ids) {
        return result.topic_ids.map(t => topics.findBy('id', t));
      }
      return result;
    }).catch(() => {
      bootbox.alert(I18n.t('generic_error'));
      this.set('loading', false);
    });
  },

  forEachPerformed(operation, cb) {
    this.perform(operation).then(topics => {
      if (topics) {
        topics.forEach(cb);
        (this.get('refreshClosure') || Ember.k)();
        this.send('closeModal');
      }
    });
  },

  performAndRefresh(operation) {
    return this.perform(operation).then(() => {
      (this.get('refreshClosure') || Ember.k)();
      this.send('closeModal');
    });
  },

  actions: {
    showTagTopics() {
      this.set('tags', '');
      this.set('action', 'changeTags');
      this.set('label', 'change_tags');
      this.set('title', 'choose_new_tags');
      this.send('changeBulkTemplate', 'bulk-tag');
    },

    changeTags() {
      this.performAndRefresh({type: 'change_tags', tags: this.get('tags')});
    },

    showAppendTagTopics() {
      this.set('tags', '');
      this.set('action', 'appendTags');
      this.set('label', 'append_tags');
      this.set('title', 'choose_append_tags');
      this.send('changeBulkTemplate', 'bulk-tag');
    },

    appendTags() {
      this.performAndRefresh({type: 'append_tags', tags: this.get('tags')});
    },

    showChangeCategory() {
      this.send('changeBulkTemplate', 'modal/bulk-change-category');
      this.set('modal.modalClass', 'topic-bulk-actions-modal full');
    },

    showNotificationLevel() {
      this.send('changeBulkTemplate', 'modal/bulk-notification-level');
    },

    deleteTopics() {
      this.performAndRefresh({type: 'delete'});
    },

    closeTopics() {
      this.forEachPerformed({type: 'close'}, t => t.set('closed', true));
    },

    archiveTopics() {
      this.forEachPerformed({type: 'archive'}, t => t.set('archived', true));
    },

    unlistTopics() {
      this.forEachPerformed({type: 'unlist'}, t => t.set('visible', false));
    },

    relistTopics() {
      this.forEachPerformed({type: 'relist'}, t => t.set('visible', true));
    },

    changeCategory() {
      const categoryId = parseInt(this.get('newCategoryId'), 10) || 0;
      const category = Discourse.Category.findById(categoryId);

      this.perform({type: 'change_category', category_id: categoryId}).then(topics => {
        topics.forEach(t => t.set('category', category));
        (this.get('refreshClosure') || Ember.k)();
        this.send('closeModal');
      });
    },

    resetRead() {
      this.performAndRefresh({ type: 'reset_read' });
    }
  }
});

export { addBulkButton };
