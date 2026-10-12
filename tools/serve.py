#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""本地课程服务器。

手机上看的用法：
    python3 tools/serve.py 8777 --lan
然后用手机浏览器打开终端里打印的「手机访问」地址（需要手机与电脑在同一个 Wi-Fi）。
不加 --lan 时只绑定 127.0.0.1，只有本机能访问（更安全，适合在公共网络上用）。


比 `python3 -m http.server` 多两件事，都是实际踩过的坑：

① 多线程 + 大队列。
   课程页加载时会并发拉一批资源（外壳、lesson.js、quiz.js、KaTeX 字体…）。
   单线程 http.server 的监听队列默认只有 5，队列一满就 connection reset，
   前端会把失败误判成「文件不存在」（曾因此把 27 课标成「写作中」）。

② 禁用缓存。
   http.server 不发 Cache-Control，浏览器会按启发式规则缓存 index.html 与
   manifest.json。课程重构后旧的课表会被一直用着，页面显示成旧课程
   （用户实际遇到过：标题仍是旧的「强化学习入门 · 应用向」）。

用法: python3 tools/serve.py [端口]   默认 8777
"""
import os
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Server(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 256


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 只在出错时打日志，避免刷屏
        status = args[1] if len(args) > 1 else ""
        if str(status).startswith(("4", "5")):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def handle_one_request(self):
        # 客户端提前断开（刷新页面、浏览器取消请求）时，socketserver 会打一整段
        # ConnectionResetError 堆栈。那是正常现象，不是故障，压掉即可。
        try:
            super().handle_one_request()
        except (ConnectionResetError, BrokenPipeError):
            self.close_connection = True


def lan_ip():
    """拿到本机在局域网里的地址（用于打印手机访问地址）。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 不真的发包，只是让系统选出默认出口对应的网卡
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    lan = "--lan" in sys.argv
    port = int(args[0]) if args else 8777
    host = "0.0.0.0" if lan else "127.0.0.1"

    try:
        srv = Server((host, port), Handler)
    except OSError as e:
        sys.stderr.write("无法在 %s:%d 上启动：%s\n" % (host, port, e))
        sys.stderr.write("端口可能已被占用。换一个端口试试，例如：./start.sh 8788 --lan\n")
        raise SystemExit(1)

    sys.stderr.write("课程服务器已启动\n")
    sys.stderr.write("  本机访问： http://127.0.0.1:%d/\n" % port)
    if lan:
        ip = lan_ip()
        if ip:
            sys.stderr.write("  手机访问： http://%s:%d/   ← 手机连同一个 Wi-Fi，浏览器打开这个\n" % (ip, port))
        else:
            sys.stderr.write("  手机访问： http://<本机局域网 IP>:%d/\n" % port)
        sys.stderr.write("  （已绑定 0.0.0.0，同一局域网内的设备都能访问。公共网络上请谨慎使用。）\n")
    else:
        sys.stderr.write("  只绑定了 127.0.0.1：仅本机可访问。想在手机上看，加 --lan 重启。\n")
    sys.stderr.write("  根目录： %s\n" % ROOT)
    srv.serve_forever()


if __name__ == "__main__":
    main()
