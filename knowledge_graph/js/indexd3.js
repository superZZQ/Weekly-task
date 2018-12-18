/*
* @Author: ZZQ
* @Date:   2018-11-03 20:24:51
* @Last Modified by:   ZZQ
* @Last Modified time: 2018-11-08 15:24:37
*/
const api2 = 'data.json';

        const width = 700;
        const height = 800;
        const initScale = 0.6;
        let draging = false;

        const nodeConf = {
            fillColor: {
                Centre: '#d05454',
                Sort: '#539cb1',
                Term: '#c6d2c3'
            },
            strokeColor: {
                Centre: '#ecbfc1',
                Sort: '#fff',
                Term: '#fff'
            },
            strokeWidth: {
                Centre: 1,
                Sort: 0,
                Term: 0
            },
            textFillColor: {
                Centre: '#fff',
                Sort: '#fff',
                Term: '#666'
            },
            radius: {
                Centre: 53,
                Sort: 37,
                Term: 42
            },
            setFontSize:{
                Centre: 24,
                Sort: 18,
                Term: 20
            }
        };
        

        let nodesMap = {};
        let linkMap = {};

        // 力导向图
        const force = d3.layout.force()
            .size([width, height]) // 画布的大小
            .linkDistance(5) // 连线长度
            .charge(-4000); // 排斥/吸引，值越小越排斥

        // 全图缩放器
        const zoom = d3.behavior.zoom()
            .scaleExtent([0.5, 5])
            .on('zoom', zoomFn);

        // 节点拖拽器（使用 d3.behavior.drag 节点拖动失效）
        const drag = force.drag()
            .origin(d => d)
            .on('dragstart', dragstartFn)
            .on('drag', dragFn)
            .on('dragend', dragendFn);

        // SVG
        const svg = d3.select('#canvas').append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .call(zoom)
            .on('dblclick.zoom', null);

        // 缩放层（位置必须在 container 之前）
        const zoomOverlay = svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .style('fill', 'none')
            .style('pointer-events', 'all');

        const container = svg.append('g')
            .attr('transform', 'scale(' + initScale + ')')
            .attr('class', 'container');

        // 请求数据，绘制图表
        d3.json(api2, (error, resp) => {
            if (error) {
                return console.error(error);
            }

            // 初始化
            setTimeout(function() {
                initialize(resp);
            }, 10);
        });

        // 初始化
        function initialize(resp) {
            let {
                nodes,
                edges
            } = resp;

            const nodesLength = nodes.length;

            // 生成 nodes map
            nodesMap = genNodesMap(nodes);

            // 构建 nodes（不能直接使用 api 中的 nodes）
            nodes = d3.values(nodesMap);

            // 起点和终点相同的关系映射
            linkMap = genLinkMap(edges);

            // 构建 links（source 属性必须从 0 开始）
            const links = genLinks(edges);

            // 绑定力导向图数据
            force
                .nodes(nodes) // 设定节点数组
                .links(links); // 设定连线数组

            // 开启力导向布局
            force.start();

            // 手动快速布局
            for (let i = 0, n = 1000; i < n; ++i) {
                force.tick();
            }

            // 停止力布局
            force.stop();

            // 节点连线    
            const linkLine = container.selectAll('.link')
                .data(force.links())
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr({
                    'marker-end': link => 'url(#' + 'marker-' + link.id + ')' 
                })
                .style('stroke', '#bbb');
            const linkLine2 = container.selectAll('.link')
                .data(force.links())
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr({
                    'marker-end': link => 'url(#' + 'marker-' + link.id + ')' 
                })
                .style('stroke', '#bbb');

            // 节点（圆）
            const nodeCircle = container.append('g')
                .selectAll('.node')
                .data(force.nodes())
                .enter()
                .append('g')
                .style('cursor', 'pointer')
                .attr('class', 'node')
                .attr('cx', node => node.x)
                .attr('cy', node => node.y)
                .call(drag); // 节点可拖动

            nodeCircle.append('circle')
                .style('fill', node => nodeConf.fillColor[node.ntype])
                .style('stroke', node => nodeConf.strokeColor[node.ntype])
                .style('stroke-width', node => nodeConf.strokeWidth[node.ntype])
                .style('font-size', node => nodeConf.setFontSize[node.ntype])
                .attr('class', 'node-circle')
                .attr('id', node => 'node-circle-' + node.id)
                .attr('r', node => nodeConf.radius[node.ntype]);

            // 鼠标交互
            nodeCircle.on('mouseenter', function (currNode) {
                    if (draging) {
                        return;
                    }
                    toggleNode(nodeCircle, currNode, true);
                    toggleLine(linkLine, linkLine2,currNode, true);
                })
                .on('mouseleave', function (currNode) {
                    if (draging) {
                        return;
                    }
                    toggleNode(nodeCircle, currNode, false);
                    toggleLine(linkLine,linkLine2, currNode, false);
                });

            // 节点文字
            const nodeText = nodeCircle.append('text')
                .attr('class', 'nodetext')
                .attr('id', node => 'node-text-' + node.id)
                .style('font-size', ({
                    ntype
                }) => nodeConf.setFontSize[ntype])
                .style('font-weight', 400)
                .style('fill', ({
                    ntype
                }) => nodeConf.textFillColor[ntype])
                .attr('text-anchor', 'middle')
                .attr('dy', '.35em')
                .attr('x', function ({
                    name
                }) {
                    return textBreaking(d3.select(this), name);
                });


            // 更新力导向图
            function tick() {
                // 节点位置
                nodeCircle.attr('transform', node => 'translate(' + node.x + ',' + node.y + ')');
                // 连线路径
                linkLine.attr('d', link => genLinkPath(link));
                linkLine2.attr('d', link => genLinkPath2(link));
            }

            // 更新力导向图
            // 注意1：必须调用一次 tick （否则，节点会堆积在左上角）
            // 注意2：调用位置必须在 nodeCircle, nodeText, linkLine, lineText 后
            setTimeout(function() {
                tick();
            }, 10);

            // 监听力学图运动事件，更新坐标
            force.on('tick', tick);

        }

        function genLinks(edges) {
            const indexHash = {};

            return edges.map(function ({
                id,
                startNode,
                endNode
            }, i) {
                const linkKey = startNode + '-' + endNode;
                const count = linkMap[linkKey];
                if (indexHash[linkKey]) {
                    indexHash[linkKey] -= 1;
                } else {
                    indexHash[linkKey] = count - 1;
                }

                return {
                    id,
                    source: nodesMap[startNode],
                    target: nodesMap[endNode],
                    count: linkMap[linkKey],
                    index: indexHash[linkKey]
                }
            })
        }

        function genLinkMap(edges) {
            const hash = {};
            edges.map(function ({
                startNode,
                endNode,
            }) {
                const key = startNode + '-' + endNode;
                if (hash[key]) {
                    hash[key] += 1;
                    /*hash[key + '-label'] += '、' + label;*/
                } else {
                    hash[key] = 1;
                    /*hash[key + '-label'] = label;*/
                }
            });
            return hash;
        }

        function genNodesMap(nodes) {
            const hash = {};
            nodes.map(function ({
                id,
                name,
                ntype
            }) {
                hash[id] = {
                    id,
                    name,
                    ntype
                };
            });
            return hash;
        }

        // 生成关系连线路径
        function genLinkPath(link) {
            const sr = nodeConf.radius.Centre;
            const tr = nodeConf.radius.Sort;

            const count = link.count;
            const index = link.index;

            let sx = link.source.x;
            let tx = link.target.x;

            let sy = link.source.y;
            let ty = link.target.y;

            return 'M' + sx + ',' + sy + ' L' + tx + ',' + ty ;
        }
        function genLinkPath2(link) {
            const tr = nodeConf.radius.Sort;
            const mr = nodeConf.radius.Term;

            const count = link.count;
            const index = link.index;

            let tx = link.target.x;
            let mx = link.target.x;

            let ty = link.target.y;
            let my = link.target.y;

            return 'M' + tx + ',' + ty + ' L' + mx + ',' + my ;
        }
        function getLineAngle(sx, sy, tx, ty) {
            // 两点 x, y 坐标偏移值
            const x = tx - sx;
            const y = ty - sy;
            // 斜边长度
            const hypotenuse = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) | 1;
            // 求出弧度
            const cos = x / hypotenuse;
            const radian = Math.acos(cos);
            // 用弧度算出角度   
            let angle = 180 / (Math.PI / radian);
            if (y < 0) {
                angle = -angle;
            } else if ((y == 0) && (x < 0)) {
                angle = 180;
            }
            return angle;
        }
        function getLineAngle2(tx, ty, mx, my) {
            // 两点 x, y 坐标偏移值
            const x = mx - tx;
            const y = my - ty;
            // 斜边长度
            const hypotenuse = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) | 1;
            // 求出弧度
            const cos = x / hypotenuse;
            const radian = Math.acos(cos);
            // 用弧度算出角度   
            let angle = 180 / (Math.PI / radian);
            if (y < 0) {
                angle = -angle;
            } else if ((y == 0) && (x < 0)) {
                angle = 180;
            }
            return angle;
        }
        function zoomFn() {
            const {
                translate,
                scale
            } = d3.event;
            container.attr('transform', 'translate(' + translate + ')scale(' + scale * initScale + ')');
        }

        function dragstartFn(d) {
            draging = true;
            d3.event.sourceEvent.stopPropagation();
            force.start();
        }

        function dragFn(d) {
            draging = true;
            d3.select(this)
                .attr('cx', d.x = d3.event.x)
                .attr('cy', d.y = d3.event.y);
        }

        function dragendFn(d) {
            draging = false;
            force.stop();  
        }

        function isLinkLine(node, link) {
            return link.source.id == node.id || link.target.id == node.id;
        }

        function isLinkNode(currNode, node) {
            if (currNode.id === node.id) {
                return true;
            }
            return linkMap[currNode.id + '-' + node.id] || linkMap[node.id + '-' + currNode.id];
        }

        function textBreaking(d3text, text) {
            const len = text.length;
            if (len <= 4) {
                d3text.append('tspan')
                    .attr('x', 0)
                    .attr('y', 2)
                    .text(text);
            } else {
                const topText = text.substring(0, 4);
                const midText = text.substring(4, 9);
                let botText = text.substring(9, len);
                let topY = -22;
                let midY = 8;
                let botY = 34;
                if (len <= 10) {
                    topY += 10;
                    midY += 10;
                } else {
                    botText = text.substring(9, 11) + '...';
                }

                d3text.text('');
                d3text.append('tspan')
                    .attr('x', 0)
                    .attr('y', topY)
                    .text(function () {
                        return topText;
                    });
                d3text.append('tspan')
                    .attr('x', 0)
                    .attr('y', midY)
                    .text(function () {
                        return midText;
                    });
                d3text.append('tspan')
                    .attr('x', 0)
                    .attr('y', botY)
                    .text(function () {
                        return botText;
                    });
            }
        }


        function toggleNode(nodeCircle, currNode, isHover) {
            if (isHover) {
                // 提升节点层级 
                nodeCircle.sort((a, b) => a.id === currNode.id ? 1 : -1);
                // this.parentNode.appendChild(this);
                nodeCircle
                    .style('opacity', .1)
                    .filter(node => isLinkNode(currNode, node))
                    .style('opacity', 1);

            } else {
                nodeCircle.style('opacity', 1);
            }

        }

        function toggleLine(linkLine,linkLine2, currNode, isHover) {
            if (isHover) {
                // 加重连线样式
                linkLine
                    .style('opacity', .1)
                    .filter(link => isLinkLine(currNode, link))
                    .style('opacity', 1)
                    .classed('link-active', true);
                linkLine2
                    .style('opacity', .1)
                    .filter(link => isLinkLine(currNode, link))
                    .style('opacity', 1)
                    .classed('link-active', true);    
            } else {
                // 连线恢复样式
                linkLine
                    .style('opacity', 1)
                    .classed('link-active', false);
                linkLine2
                    .style('opacity', 1)
                    .classed('link-active', false);
            }
        }


        function round(num, pow = 2) {
            const multiple = Math.pow(10, pow);
            return Math.round(num * multiple) / multiple;
        }