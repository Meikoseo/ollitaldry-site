(function ($) {
  'use strict';

  function openMedia(multiple, callback, mediaTypes) {
    var isVideo = mediaTypes === 'video';
    var frame = wp.media({
      title: isVideo ? '选择首图视频' : (multiple ? '选择多张图片' : '选择图片'),
      button: { text: isVideo ? '使用此视频' : '使用所选图片' },
      multiple: multiple,
      library: { type: mediaTypes || 'image' }
    });

    frame.on('select', function () {
      callback(frame.state().get('selection'));
    });
    frame.open();
  }

  $(document).on('click', '.ollitaldry-media-select', function (event) {
    event.preventDefault();
    var field = $(this).closest('.ollitaldry-admin-field, .form-field, td');
    openMedia(false, function (selection) {
      var item = selection.first().toJSON();
      var url = item.sizes && item.sizes.medium ? item.sizes.medium.url : item.url;
      field.find('.ollitaldry-media-id').val(item.id);
      field.find('.ollitaldry-media-preview').html('<img src="' + url + '" alt="">');
    });
  });

  $(document).on('click', '[data-resource-video-select]', function () {
    var field = $(this).closest('[data-resource-video-field]');
    openMedia(false, function (selection) {
      field.find('input').val(selection.first().toJSON().id).trigger('change');
    }, 'video');
  });

  $(document).on('click', '.ollitaldry-media-remove', function (event) {
    event.preventDefault();
    var field = $(this).closest('.ollitaldry-admin-field, .form-field, td');
    field.find('.ollitaldry-media-id').val('');
    field.find('.ollitaldry-media-preview').empty();
  });

  function updateBannerRows() {
    $('[data-banner-items] [data-banner-row]').each(function (index) {
      var row = $(this);
      row.find('[name]').each(function () {
        var input = $(this);
        var name = input.attr('name');
        if (name && name.indexOf('ollitaldry_home_settings[hero_slides]') === 0) {
          input.attr('name', name.replace(/\[hero_slides\]\[[^\]]+\]/, '[hero_slides][' + index + ']'));
        }
      });
      row.find('[data-banner-number]').text('Banner ' + (index + 1));
    });
  }

  $('[data-banner-items]').sortable({
    items: '[data-banner-row]',
    handle: '.ollitaldry-drag-handle',
    placeholder: 'ollitaldry-repeater-placeholder',
    update: updateBannerRows
  });

  $(document).on('click', '.ollitaldry-add-banner', function () {
    var template = $('#ollitaldry-banner-template').html();
    var index = $('[data-banner-items] [data-banner-row]').length;
    $('[data-banner-items]').append(template.replace(/__INDEX__/g, index));
    updateBannerRows();
    $('[data-banner-items] [data-banner-row]').last().find('input[type="text"]').first().trigger('focus');
  });

  $(document).on('click', '.ollitaldry-remove-banner', function () {
    if (window.confirm('确定删除这张 Banner 吗？保存设置后删除才会正式生效。')) {
      $(this).closest('[data-banner-row]').remove();
      updateBannerRows();
    }
  });

  $(document).on('input', '[data-banner-row] input[name$="[title]"]', function () {
    $(this).closest('[data-banner-row]').find('[data-banner-title]').text($(this).val());
  });

  $(document).on('click', '.ollitaldry-gallery-upload', function (event) {
    event.preventDefault();
    var box = $(this).closest('#ollitaldry-product-gallery');
    openMedia(true, function (selection) {
      selection.each(function (attachment) {
        var item = attachment.toJSON();
        var thumb = item.sizes && item.sizes.thumbnail ? item.sizes.thumbnail.url : item.url;
        box.find('.ollitaldry-gallery-sortable').append('<div class="ollitaldry-gallery-item" data-id="' + item.id + '"><img src="' + thumb + '" alt=""><button type="button" class="button-link-delete ollitaldry-remove-gallery">&times;</button></div>');
      });
      updateGallery(box);
    });
  });

  function updateGallery(box) {
    var ids = [];
    box.find('.ollitaldry-gallery-item').each(function () {
      ids.push($(this).data('id'));
    });
    box.find('.ollitaldry-gallery-ids').val(ids.join(','));
  }

  $('.ollitaldry-gallery-sortable').sortable({
    update: function () {
      updateGallery($(this).closest('#ollitaldry-product-gallery'));
    }
  });

  $(document).on('click', '.ollitaldry-remove-gallery', function () {
    var box = $(this).closest('#ollitaldry-product-gallery');
    $(this).parent().remove();
    updateGallery(box);
  });

  $(document).on('click', '.ollitaldry-add-parameter', function () {
    $(this).siblings('.ollitaldry-parameter-rows').append('<div class="ollitaldry-parameter-row"><input type="text" name="ollitaldry_parameter_name[]" placeholder="参数名称"><input type="text" name="ollitaldry_parameter_value[]" placeholder="参数值"><button type="button" class="button-link-delete ollitaldry-remove-parameter">删除</button></div>');
  });

  $(document).on('click', '.ollitaldry-remove-parameter', function () {
    $(this).closest('.ollitaldry-parameter-row').remove();
  });

  function escapeHtml(value) {
    return $('<div>').text(value || '').html();
  }

  function updateManagedGallery(gallery) {
    var prefix = gallery.data('gallery-prefix');
    var withAlt = String(gallery.data('gallery-alt')) === '1';
    gallery.find('[data-managed-gallery-item]').each(function (index) {
      var item = $(this);
      item.find('[data-gallery-field="image"]').attr('name', withAlt ? prefix + '[' + index + '][image]' : prefix + '[' + index + ']');
      if (withAlt) {
        item.find('[data-gallery-field="alt"]').attr('name', prefix + '[' + index + '][alt]');
      }
    });
    gallery.toggleClass('is-empty', gallery.find('[data-managed-gallery-item]').length === 0);
    var videoField = gallery.find('[data-gallery-video-field]');
    var hasVideo = Boolean(videoField.val());
    gallery.toggleClass('has-cover-video', hasVideo);
    gallery.find('[data-managed-gallery-item]').removeClass('is-cover-image').first().addClass('is-cover-image');
    gallery.find('[data-gallery-video-label]').text(hasVideo ? '更换视频' : '添加视频');
    gallery.find('[data-gallery-video-remove]').prop('hidden', !hasVideo);
    gallery.find('[data-gallery-bulk-alt]').prop('disabled', gallery.find('[data-managed-gallery-item]').length === 0);
  }

  function managedGalleryItem(item, withAlt, allowsVideo) {
    var thumb = item.sizes && item.sizes.medium ? item.sizes.medium.url : item.url;
    var alt = item.alt || item.title || '';
    var videoTools = allowsVideo
      ? '<div class="ollitaldry-managed-gallery__video-tools"><button type="button" data-gallery-video-select><span class="dashicons dashicons-controls-play" aria-hidden="true"></span><span data-gallery-video-label>添加视频</span></button><button type="button" data-gallery-video-remove aria-label="移除首图视频">&times;</button></div>'
      : '';
    return '<div class="ollitaldry-managed-gallery__item" data-managed-gallery-item>' +
      '<button type="button" class="ollitaldry-managed-gallery__remove" data-managed-gallery-remove aria-label="移除图片">&times;</button>' +
      '<div class="ollitaldry-managed-gallery__preview"><img src="' + escapeHtml(thumb) + '" alt="">' + videoTools + '</div>' +
      '<input type="hidden" data-gallery-field="image" value="' + item.id + '">' +
      (withAlt ? '<label>ALT 内容<input type="text" data-gallery-field="alt" value="' + escapeHtml(alt) + '" placeholder="描述图片中的设备或场景"></label>' : '') +
      '</div>';
  }

  function initManagedGallery(gallery) {
    if (gallery.data('gallery-ready')) {
      updateManagedGallery(gallery);
      return;
    }
    gallery.data('gallery-ready', true);
    gallery.find('[data-managed-gallery-items]').sortable({
      items: '[data-managed-gallery-item]',
      cancel: 'input, textarea, button, a, video',
      distance: 4,
      tolerance: 'pointer',
      forcePlaceholderSize: true,
      placeholder: 'ollitaldry-managed-gallery__placeholder',
      update: function () { updateManagedGallery(gallery); }
    });
    updateManagedGallery(gallery);
  }

  $('[data-managed-gallery]').each(function () { initManagedGallery($(this)); });

  $(document).on('click', '[data-managed-gallery-add]', function () {
    var gallery = $(this).closest('[data-managed-gallery]');
    var withAlt = String(gallery.data('gallery-alt')) === '1';
    var allowsVideo = String(gallery.data('gallery-cover-video')) === '1';
    openMedia(true, function (selection) {
      selection.each(function (attachment) {
        gallery.find('[data-managed-gallery-add]').before(managedGalleryItem(attachment.toJSON(), withAlt, allowsVideo));
      });
      initManagedGallery(gallery);
      updateManagedGallery(gallery);
    }, 'image');
  });

  $(document).on('click', '[data-gallery-video-select]', function () {
    var gallery = $(this).closest('[data-managed-gallery]');
    openMedia(false, function (selection) {
      var attachment = selection.first();
      if (!attachment) return;
      gallery.find('[data-gallery-video-field]').val(attachment.get('id'));
      updateManagedGallery(gallery);
    }, 'video');
  });

  $(document).on('click', '[data-gallery-video-remove]', function () {
    var gallery = $(this).closest('[data-managed-gallery]');
    gallery.find('[data-gallery-video-field]').val('');
    updateManagedGallery(gallery);
  });

  $(document).on('click', '[data-managed-gallery-remove]', function () {
    var gallery = $(this).closest('[data-managed-gallery]');
    $(this).closest('[data-managed-gallery-item]').remove();
    updateManagedGallery(gallery);
  });

  $(document).on('click', '[data-gallery-bulk-alt]', function () {
    var gallery = $(this).closest('[data-managed-gallery]');
    var input = gallery.find('[data-gallery-bulk-alt-input]');
    var value = $.trim(input.val());
    if (!value) {
      input.trigger('focus');
      return;
    }
    gallery.find('[data-managed-gallery-item] [data-gallery-field="alt"]').val(value).trigger('change');
  });

  $(document).on('keydown', '[data-gallery-bulk-alt-input]', function (event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    $(this).closest('[data-managed-gallery]').find('[data-gallery-bulk-alt]').trigger('click');
  });

  function updateSpecificationRows(editor) {
    editor.find('[data-spec-row]').each(function (rowIndex) {
      $(this).find('[data-spec-cell]').each(function () {
        var column = $(this).data('spec-cell');
        $(this).attr('name', 'ollitaldry_page_content[specifications][' + rowIndex + '][' + column + ']');
      });
      $(this).find('[data-spec-remove-row]').prop('disabled', rowIndex === 0).attr('aria-disabled', rowIndex === 0 ? 'true' : 'false');
    });
  }

  $(document).on('click', '[data-spec-add-row]', function () {
    var editor = $(this).closest('[data-spec-editor]');
    var cells = '';
    for (var column = 0; column < 4; column += 1) {
      cells += '<td><input type="text" data-spec-cell="' + column + '" value=""></td>';
    }
    editor.find('[data-spec-rows]').append('<tr data-spec-row>' + cells + '<td><button type="button" class="button-link-delete" data-spec-remove-row>删除</button></td></tr>');
    updateSpecificationRows(editor);
    editor.find('[data-spec-row]').last().find('input').first().trigger('focus');
  });

  $(document).on('click', '[data-spec-remove-row]:not(:disabled)', function () {
    var editor = $(this).closest('[data-spec-editor]');
    $(this).closest('[data-spec-row]').remove();
    updateSpecificationRows(editor);
  });

  function updateManagedRepeater(repeater) {
    var key = repeater.data('managed-repeater');
    var pattern = new RegExp('\\[' + key + '\\]\\[[^\\]]+\\]');
    repeater.find('[data-managed-repeater-item]').each(function (index) {
      var item = $(this);
      item.find('[name]').each(function () {
        $(this).attr('name', $(this).attr('name').replace(pattern, '[' + key + '][' + index + ']'));
      });
      item.find('[data-repeater-number]').text(index + 1);
      item.find('[data-managed-gallery]').each(function () {
        var gallery = $(this);
        gallery.data('gallery-prefix', gallery.data('gallery-prefix').replace(pattern, '[' + key + '][' + index + ']'));
        updateManagedGallery(gallery);
      });
    });
  }

  $(document).on('click', '[data-managed-repeater-add]', function () {
    var key = $(this).data('managed-repeater-add');
    var repeater = $(this).closest('[data-managed-repeater]');
    var template = repeater.find('[data-managed-repeater-template="' + key + '"]').html();
    var index = repeater.find('[data-managed-repeater-item]').length;
    var html = template.replace(/__INDEX__/g, index).replace(/__KEY__/g, 'custom-option-' + Date.now());
    $('[data-page-editor] .ollitaldry-page-card[open]').prop('open', false);
    repeater.find('[data-managed-repeater-items]').append(html);
    repeater.find('[data-managed-gallery]').each(function () { initManagedGallery($(this)); });
    updateManagedRepeater(repeater);
    repeater.find('[data-managed-repeater-item]').last().find('input[type="text"]').first().trigger('focus');
  });

  $(document).on('click', '[data-managed-repeater-remove]', function () {
    if (!window.confirm('确定删除这条内容吗？点击“更新”后才会正式生效。')) {
      return;
    }
    var repeater = $(this).closest('[data-managed-repeater]');
    $(this).closest('[data-managed-repeater-item]').remove();
    updateManagedRepeater(repeater);
  });

  $(document).on('input', '[data-managed-repeater] input[name$="[title]"], [data-managed-repeater] input[name$="[question]"]', function () {
    $(this).closest('[data-managed-repeater-item]').find('[data-repeater-title]').text($(this).val() || '未命名内容');
  });

  document.addEventListener('toggle', function (event) {
    if (!event.target.matches || !event.target.matches('.ollitaldry-page-card') || !event.target.open) {
      return;
    }
    document.querySelectorAll('.ollitaldry-page-card[open]').forEach(function (details) {
      if (details !== event.target) {
        details.open = false;
      }
    });
  }, true);

  $('[data-page-editor] .ollitaldry-page-card[open]').slice(1).prop('open', false);

  function updateSeoCounter(field) {
    var input = field.find('[data-seo-input]');
    var limit = parseInt(field.data('seo-limit'), 10) || 0;
    var characters = Array.from(input.val() || '');
    if (limit && characters.length > limit) {
      input.val(characters.slice(0, limit).join(''));
      characters = Array.from(input.val());
    }
    field.find('[data-seo-count]').text(characters.length);
    field.toggleClass('is-near-limit', limit && characters.length >= Math.floor(limit * 0.9));
  }

  $('[data-seo-field]').each(function () { updateSeoCounter($(this)); });
  $(document).on('input', '[data-seo-input]', function () { updateSeoCounter($(this).closest('[data-seo-field]')); });

  function activatePageEditorTab(tab) {
    var editor = $('[data-page-editor]');
    if (!editor.length || !editor.find('[data-page-editor-panel="' + tab + '"]').length) {
      return;
    }
    editor.find('[data-page-editor-tab]').removeClass('nav-tab-active').attr('aria-selected', 'false');
    editor.find('[data-page-editor-tab="' + tab + '"]').addClass('nav-tab-active').attr('aria-selected', 'true');
    editor.find('[data-page-editor-panel]').removeClass('is-active').prop('hidden', true);
    editor.find('[data-page-editor-panel="' + tab + '"]').addClass('is-active').prop('hidden', false);
  }

  $(document).on('click', '[data-page-editor-tab]', function () {
    var tab = $(this).data('page-editor-tab');
    activatePageEditorTab(tab);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + '#ollital-' + tab);
    }
  });

  if ($('[data-page-editor]').length) {
    var initialTab = window.location.hash.replace('#ollital-', '');
    activatePageEditorTab(initialTab || 'hero');
  }
}(jQuery));
