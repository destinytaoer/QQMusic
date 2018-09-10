let musicRender = (function () {
  let $headerBox = $('.headerBox'),
    $footerBox = $('.footerBox'),
    $contentBox = $('.contentBox'),
    $wrapper = $contentBox.find('.wrapper'),
    $lyricList = null,
    $musicAudio = $('.musicAudio'),
    $playBtn = $headerBox.find('.playBtn'),
    $already = $footerBox.find('.already'),
    $duration = $footerBox.find('.duration'),
    $current = $footerBox.find('.current');

  //=> queryLyric: 获取歌词
  let queryLyric = function queryLyric(url) {
    return new Promise(resolve => {
      $.ajax({
        url: url,
        method: 'get',
        dataType: 'json',
        success: resolve
      });
    });
  }

  //=> formatData: 解析歌词
  let formatData = function formatData(result) {
    //=> 替换歌词中相应的特殊字符
    let {
      lyric = ''
    } = result,
    obj = {
      32: ' ',
      40: '(',
      41: ')',
      45: '-'
    };

    lyric = lyric.replace(/&#(\d+);/g, (...arg) => {
      let [item, num] = arg;
      item = obj[num] || item;
      return item;
    });

    //=> 获取歌词中的分钟、秒钟、内容等
    // 向歌词的末尾添加一个结束符，为了匹配最后一个
    lyric += '&#10;';
    let lyricAry = [],
      reg = /\[(\d+)&#58;(\d+)&#46;(?:\d+)\]([^&#]+)&#10;/g,
      regTi = /\[ti&#58;([^&#]+)\]&#10;/,
      regAr = /\[ar&#58;([^&#]+)\]&#10;/;

    let title = lyric.match(regTi)[1],
      author = lyric.match(regAr)[1];

    lyricAry.push({
      title,
      author
    });

    lyric.replace(reg, (...arg) => {
      let [, minutes, seconds, content] = arg;
      lyricAry.push({
        minutes,
        seconds,
        content
      });
    });
    return lyricAry;
  }

  //=> bindHTML: 将获取的歌词放入页面中
  let bindHTML = function bindHTML(lyricAry) {
    let str = ``;
    let {
      title,
      author
    } = lyricAry.shift();
    $headerBox.find('.title').html(`<h1>${title}</h1>
    <h2>${author}</h2>`)
    lyricAry.forEach(item => {
      let {
        minutes,
        seconds,
        content
      } = item;
      // 将分和秒设置为自定义属性，后面需要直接获取即可
      str += `<p data-minutes="${minutes}" data-seconds="${seconds}">${content}</p>`;
    });
    $wrapper.html(str);
    $lyricList = $wrapper.find('p');
  }

  //=> 基于发布订阅来规划能够播放时要做的事情
  let play = function play(index) {
    let $plan = $.Callbacks();

    $musicAudio[index].load();

    // 加载完毕可以播放了
    $musicAudio[index].addEventListener('canplay', function () {
      let duration = $musicAudio[index].duration;
      $duration.html(computedTime(duration));
      $playBtn.tap(() => {
        $plan.fire(index);
      });
    });

    //=> 控制播放按钮显示
    $plan.add((index) => {
      //=> 不能使用 show，因为 show 还会添加一些属性，导致动画效果改变
      if ($musicAudio[index].paused) {
        $musicAudio[index].play();
        $playBtn.addClass('move');
        return;
      }
      $musicAudio[index].pause();
      $playBtn.removeClass('move');
    });

    //=> 控制进度条
    let autoTimer = null;
    $plan.add((index) => {
      let duration = $musicAudio[index].duration;
      // 监听播放状态
      autoTimer = setInterval(() => {
        let currentTime = $musicAudio[index].currentTime;

        // 播放完成
        if (currentTime >= duration) {
          clearInterval(autoTimer);
          $already.html(computedTime(duration));
          $current.css('width', '100%');

          $musicAudio[index].pause();
          $playBtn.removeClass('move');
          playNext();
          return;
        }

        // 正在播放
        $already.html(computedTime(currentTime));
        $current.css('width', currentTime / duration * 100 + '100%');
        matchLyric(currentTime);
      }, 200);
    });
  }

  //=> computedTime: 计算时间
  let computedTime = function computedTime(time) {
    let minutes = Math.floor(time / 60),
      seconds = Math.floor(time % 60);
    minutes < 10 ? minutes = '0' + minutes : null;
    seconds < 10 ? seconds = '0' + seconds : null;

    return minutes + ':' + seconds;
  }

  //=> matchLyric: 实现歌词对应
  let translateY = 0;
  let matchLyric = function matchLyric(currentTime) {
    let [minutes, seconds] = computedTime(currentTime).split(':');

    let $cur = $lyricList.filter(`[data-minutes="${minutes}"]`).filter(`[data-seconds="${seconds}"]`);

    if ($cur.length === 0) return;
    if ($cur.hasClass('active')) return;

    $cur.addClass('active');
    $lyricList.not($cur).removeClass('active');

    let curH = $cur[0].offsetHeight;

    translateY -= curH * $cur.length;
    $wrapper.css('transform', `translateY(${translateY}px)`);
  }

  //=> playNext: 播放下一曲
  let playNext = function playNext(url) {
    // 初始化
    $current.css('width', '0');
    translateY = 0;

    let promise = queryLyric('json/lyric2.json');
    promise.then(formatData)
      .then(bindHTML)
      .then(function () {
        play(1);
      });
  }

  return {
    init: function () {
      let promise = queryLyric('json/lyric.json');
      promise.then(formatData)
        .then(bindHTML).then(function () {
          play(0);
        });
    }
  }
})();

musicRender.init();