# 逐课覆盖大纲（0002–0027）

这是每一课**必须覆盖**的知识点与习题方向。写作规范见 `COURSE-SPEC.md`；
具体 HTML 骨架与习题写法请直接照抄样板 `lessons/0001-what-is-rl.html`。

统一的取舍原则（应用向）：
- 每讲一个算法，都要回答"它解决前一个算法的什么毛病"以及"什么时候该选它"。
- 公式要给，但重点放在**每个符号在实现里对应什么**。
- 诊断视角：每课尽量点出一个"训练不收敛/学坏"的典型症状与原因。
- 代码题只用标准库 + numpy，不要用 torch/gym。

---

## 0002 · bandits · 多臂老虎机：探索与利用
**覆盖**：k 臂老虎机设定；动作价值 q*(a) 与估计 Q_t(a)；样本平均法（增量式更新
Q ← Q + (1/n)(R − Q)）；ε-greedy；乐观初始值；UCB 的置信上界形式；
梯度老虎机/softmax 作为可选提及；"探索-利用"在生产里的对应物（A/B 测试、冷启动）。
**代码题方向**：① 实现增量式样本平均更新；② 实现 UCB 动作选择并验证它会优先访问不确定的臂。
**一手来源**：Sutton &amp; Barto 第 2 章。

## 0003 · mdp · 马尔可夫决策过程
**覆盖**：MDP 五元组 (S, A, P, R, γ)；马尔可夫性及"状态必须包含决策所需全部信息"；
转移概率 p(s',r|s,a)；回报 G_t；折扣 γ 的作用与数量级直觉（γ=0.9 ⇒ 10 步后权重 0.35）；
episodic vs continuing；策略 π(a|s) 与 π(s)。
**代码题方向**：① 由转移表计算一条轨迹的折扣回报；② 判断给定状态表示是否满足马尔可夫性（用代码检验"同一状态下未来分布不同"）。
**一手来源**：Sutton &amp; Barto 第 3.1–3.3 节。

## 0004 · value-bellman · 价值函数与贝尔曼方程
**覆盖**：状态价值 v_π(s)、动作价值 q_π(s,a)；贝尔曼期望方程（两个）；贝尔曼最优方程；
最优策略的存在性与贪心性（v_* 下的贪心策略即最优）；备份图（backup diagram）的文字描述；
为什么这组方程是后面所有算法的公共骨架。
**代码题方向**：① 由 p(s',r|s,a) 直接计算给定策略的 v_π（用线性方程或迭代）；② 由 q_π 提取贪心策略并验证它不差于 π。
**一手来源**：Sutton &amp; Barto 第 3.5–3.6 节。

## 0005 · dynamic-programming · 动态规划：策略迭代与价值迭代
**覆盖**：策略评估（迭代式贝尔曼期望备份）；策略改进定理；策略迭代；价值迭代；
异步 DP；DP 的适用前提是**已知模型** —— 这是后面无模型方法的出发点。
**代码题方向**：① 实现策略评估迭代；② 实现价值迭代并在 Gridworld 上验证收敛到最优价值。
**一手来源**：Sutton &amp; Barto 第 4 章。

## 0006 · modeling-your-problem · 把你的工作问题建模成 MDP（应用向重点）
**覆盖**：把业务对象映射成 (S, A, R, γ, 终止)；状态设计的信息完备性与特征工程；
奖励设计：稀疏奖励、奖励黑客（reward hacking）、塑形（potential-based shaping 的直觉）；
动作空间离散/连续的差别；动作频率与决策周期；仿真环境的价值与"离线 replay"的局限；
一份可操作的建模检查表。
**代码题方向**：① 为给定的库存场景写出状态/动作/奖励并把一步转移写成代码；② 计算一个"奖励设计错误"导致的最优行为（例如奖励只看销量导致疯狂压货）。
**一手来源**：Sutton &amp; Barto 第 3 章 + Gymnasium `Env` API 文档（RESOURCES.md）。

## 0007 · monte-carlo · 蒙特卡洛方法
**覆盖**：首次访问 vs 每次访问 MC 预测；用经验均值估计 v_π；MC 控制与探索起点；
ε-soft 策略与 on-policy MC 控制；重要性采样（off-policy MC）的直觉与方差爆炸；
MC 必须等回合结束 → 引出 TD。
**代码题方向**：① 首次访问 MC 估计随机游走的状态价值；② 用 ε-soft MC 控制解一个小型 Gridworld。
**一手来源**：Sutton &amp; Barto 第 5 章。可用 `data-sim="random-walk"`。

## 0008 · td-learning · 时序差分 TD(0)
**覆盖**：TD 预测更新 V(s) ← V(s) + α[r + γV(s') − V(s)]；TD 误差 δ_t；
自举（bootstrapping）；TD vs MC 的偏差-方差权衡；TD 在随机游走上的优势（S&B 图 6.2）；
批量 TD 与最大似然解的关系。
**代码题方向**：① 实现 TD(0) 预测；② 用同一环境对比 MC 与 TD 的收敛速度（固定随机种子做统计比较）。
**一手来源**：Sutton &amp; Barto 第 6.1–6.3 节。可用 `data-sim="random-walk"`。

## 0009 · sarsa · SARSA：on-policy 控制
**覆盖**：由 TD 预测到控制的跳跃；SARSA 更新式（用实际采取的 a'）；
ε-greedy 下的收敛性直觉；on-policy 的含义 —— 它评估的是**你正在执行的探索策略**；
悬崖行走（Cliff Walking）上 SARSA 与 Q-learning 的行为差异。
**代码题方向**：① 实现 SARSA 一步更新；② 在悬崖行走上跑 SARSA 并统计其学到的路径为何远离悬崖。
**一手来源**：Sutton &amp; Barto 第 6.4–6.5 节。可用 `data-sim="gridworld" data-mode="q-learning"`。

## 0010 · q-learning · Q-Learning：off-policy 控制
**覆盖**：Q-learning 更新式（用 max_a' Q(s',a') 作为目标）；
off-policy 的含义：行为策略与目标策略分离；为什么 Q-learning 在 ε-greedy 行为下仍收敛到最优；
最大化偏差（maximization bias）的成因与例子；SARSA vs Q-learning 的对照表与选择建议。
**代码题方向**：① 实现 Q-learning 更新；② 构造一个最大化偏差例子，比较 Q-learning 与 SARSA 的估计偏差。
**一手来源**：Sutton &amp; Barto 第 6.5 节。

## 0011 · nstep-td-lambda · n-step 回报与 TD(λ)
**覆盖**：n-step 回报 G_t^(n) 的统一视角（n=1 是 TD，n=∞ 是 MC）；λ-回报；
前向视图 vs 后向视图；资格迹（eligibility trace）与 SARSA(λ)；迹的累积式与替换式；
实践建议（通常 λ≈0.9、n 取 3–5）。
**代码题方向**：① 计算 n-step 回报；② 实现累积式资格迹的 SARSA(λ) 更新并验证 λ=0 退化为 SARSA。
**一手来源**：Sutton &amp; Barto 第 7 章与 12.7 节。

## 0012 · function-approximation · 函数逼近与致命三元组
**覆盖**：为什么表格法不可用（状态爆炸、连续状态）；参数化 v̂(s;w)；
半梯度 TD 与"真正的梯度"的差别（目标也依赖 w 却忽略其梯度）；
线性逼近与特征构造（粗编码、多项式、傅里叶）；致命三元组（函数逼近 + 自举 + off-policy）；
收敛性直觉：为什么 DQN 需要用经验回放和目标网络。
**代码题方向**：① 用线性特征逼近实现半梯度 TD；② 用 tile/粗编码特征并观察外推行为。
**一手来源**：Sutton &amp; Barto 第 9–11 章。

## 0013 · dqn · DQN：经验回放与目标网络
**覆盖**：用神经网络逼近 Q 的动机；DQN 损失函数（只对所选动作计算 TD 误差）；
经验回放（replay buffer）解决样本相关性与数据效率；目标网络解决"追逐移动目标"；
ε 衰减与预处理（帧堆叠/归一化）；训练不稳定与常见症状。
**代码题方向**：① 实现经验回放缓冲区的采样；② 手写 DQN 的单步损失与目标计算（numpy，验证终止状态的目标不包含 bootstrap）。
**一手来源**：Sutton &amp; Barto 第 9 章 + Lilian Weng 的 DQN 综述（RESOURCES.md）。

## 0014 · double-dueling-dqn · Double DQN 与 Dueling DQN
**覆盖**：Double DQN：用在线网络选动作、目标网络评估，缓解过估计；
Dueling：拆成 V(s) 与 A(s,a)，中心化技巧与可辨识性；两类改进分别解决什么问题；
优先级与组合（引到 0015）。
**代码题方向**：① 实现 Double DQN 的目标计算并与 DQN 对比过估计；② 实现 Dueling 头部的聚合公式并验证其均值中心化性质。
**一手来源**：Lilian Weng DQN 综述 + arXiv 原始论文（1511.06581 / 1509.06461，经 arxiv.org 可达）。

## 0015 · prioritized-replay · 优先经验回放 PER
**覆盖**：均匀采样的低效；TD 误差作为优先级；比例优先与 rank 优先；
重要性采样权重修正偏差；sum-tree 的高效采样；β 从 0.4 退火到 1 的实践。
**代码题方向**：① 由 TD 误差算采样概率并做重要性采样权重；② 实现一个简化 sum-tree 并按优先级采样。
**一手来源**：arXiv 1511.05952 + Lilian Weng 综述。

## 0016 · rainbow-distributional · Rainbow 与分布式 RL
**覆盖**：分布式 RL 的思想（学回报分布 Z 而非期望）；C51 的类别投影；
QR-DQN 的分位数回归；Noisy Net 替代 ε-greedy；n-step、Dueling、PER 的组合（Rainbow 消融结论）；
"哪个组件最有用"的工程启示。
**代码题方向**：① 实现 C51 的投影算子；② 实现分位数回归的 pinball loss。
**一手来源**：arXiv 1710.02298（Rainbow）+ Lilian Weng 综述。

## 0017 · policy-gradient · 策略梯度与 REINFORCE
**覆盖**：为什么要直接参数化策略（连续动作、随机策略、收敛性质）；
策略梯度定理与似然比技巧 ∇J = E[∇log π(a|s) · G]；REINFORCE 算法；
用回报减基线降方差；基线与优势函数 A = G − b(s)；
策略梯度的方差问题与"为什么需要 actor-critic"。
**代码题方向**：① 实现 softmax 策略的 ∇log π；② 实现带基线的 REINFORCE 回报与更新（numpy，验证基线不引入偏差）。
**一手来源**：Spinning Up 的 Vanilla Policy Gradient 章节（RESOURCES.md）。

## 0018 · actor-critic · A2C 与 A3C：Actor-Critic
**覆盖**：actor（策略）与 critic（价值）分工；优势函数与 TD 误差作为优势估计；
一步 actor-critic 与 n-step；A3C 的异步并行与 A2C 的同步批量化；
为什么 A2C 更常用于教学/复现；熵正则项鼓励探索。
**代码题方向**：① 用 TD 误差构造优势并写出一致性检查；② 实现带熵正则的策略损失。
**一手来源**：Spinning Up 的 Actor-Critic 章节 + Sutton &amp; Barto 第 13.5 节。

## 0019 · gae-trpo · 优势估计 GAE 与 TRPO
**覆盖**：GAE(γ,λ) 的定义与它如何把 TD(λ) 思想搬到优势估计；λ 与偏差-方差；
策略更新步长的风险（一次坏更新毁掉策略）；TRPO 的置信域约束与 surrogate 目标；
共轭梯度 + 线搜索的工程成本；KL 约束的直觉。
**代码题方向**：① 实现 GAE 的反向递推；② 验证 GAE 在 λ=0 与 λ=1 时分别退化为 TD 误差与蒙特卡洛优势。
**一手来源**：Spinning Up 的 TRPO 章节 + arXiv 1502.05477。

## 0020 · ppo · PPO：裁剪目标与工程实践（应用向重点）
**覆盖**：PPO 的裁剪 surrogate 目标与 min 操作；概率比 r_t(θ) 与 clip 区间 ε；
为什么裁剪能近似信赖域且实现极简；PPO 的完整工程细节（优势归一化、多 epoch、KL 早停、价值损失系数、熵系数、学习率衰减）；
超参敏感性与常见调参顺序；PPO 什么时候不是最佳选择。
**代码题方向**：① 实现 PPO 的裁剪目标（含 min 与概率比）；② 验证当概率比超出裁剪区间时梯度被截断（数值检查）。
**一手来源**：arXiv 1707.06347（PPO）+ Spinning Up 的 PPO 章节。

## 0021 · ddpg · DDPG：确定性策略梯度
**覆盖**：连续动作空间为什么不能用 max 求 Q 最大；确定性策略 μ(s|θ) 与 DPG 定理；
actor 的更新方向 ∇_a Q · ∇_θ μ；用 Q 网络作为可微的"裁判"；
DDPG 的四网络结构与软更新（Polyak）；探索噪声（OU 噪声/高斯）；目标网络的作用；
DDPG 的脆弱性与过估计问题 → 引出 TD3。
**代码题方向**：① 实现确定性策略梯度的一步更新方向；② 实现软更新（Polyak 平均）并验证 τ=1 时退化为硬拷贝。
**一手来源**：Spinning Up 的 DDPG 章节 + arXiv 1509.02971。

## 0022 · td3 · TD3：双评论家与延迟更新
**覆盖**：TD3 对 DDPG 的三处修正：截断双 Q（clipped double-Q）、延迟策略更新、目标动作平滑；
为什么双评论家能缓解过估计；为什么延迟更新能降低方差；目标平滑的方差抑制直觉；
TD3 vs DDPG 的实践对比结论。
**代码题方向**：① 实现截断双 Q 的目标；② 验证双 Q 目标在给定 Q 值下比单 Q 更保守（并解释为什么是 min）。
**一手来源**：arXiv 1802.09477 + Spinning Up 的相关章节。

## 0023 · sac · SAC：最大熵强化学习
**覆盖**：最大熵目标 J = Σ E[r + α H(π)]；温度 α 的意义（探索与鲁棒性）与自动调节；
软 Q 与软贝尔曼方程；重参数化技巧（reparameterization trick）与路径导数；
为什么 SAC 样本效率高、对超参相对鲁棒；SAC vs TD3 的选择建议（连续控制首选）。
**代码题方向**：① 实现高斯策略的对数概率与重参数化采样；② 计算带熵项的软 Q 目标并验证 α=0 时退化为标准 Q。
**一手来源**：arXiv 1801.01290 + Spinning Up 的 SAC 章节。

## 0024 · model-based-planning · 基于模型与规划
**覆盖**：value-based / policy-based / model-based 三分法；Dyna 架构（用真实经验同时更新模型、价值和策略）；
学到的模型误差累积；MCTS 的四个步骤（选择、扩展、模拟、回传）与 UCT；
AlphaZero 的思路（MCTS + 策略/价值网络 + 自对弈）与它为什么不需要人类棋谱；
何时用模型基方法（样本昂贵时）。
**代码题方向**：① 实现 UCB1 的树选择；② 实现一个极简 MCTS 回传（用给定的小型树做数值验证）。
**一手来源**：Sutton &amp; Barto 第 8 章 + 第 16 章 AlphaGo 案例。

## 0025 · offline-imitation · 离线 RL 与模仿学习
**覆盖**：只有固定日志、不能交互的设定（真实业务最常见）；off-policy 评估的分布偏移与外推误差；
行为克隆（BC）与复合误差（compounding error）；DAgger 的思路；
离线 RL：CQL 的保守价值、IQL 的期望回归直觉；BCQ/TD3+BC 的约束思想；
实践建议：先试 BC 作为基线，再考虑离线 RL。
**代码题方向**：① 用行为数据训练 BC 并计算误差；② 演示外推误差（比较日志动作与策略偏好的动作的 Q 值）。
**一手来源**：Sutton &amp; Barto 第 11 章（off-policy） + arXiv 2006.04779（CQL）。

## 0026 · rlhf-dpo · RLHF 与 DPO：大模型对齐
**覆盖**：把"对齐"表述成 RL 问题：策略是语言模型、奖励来自人类偏好；
经典 RLHF 三步（SFT → 奖励模型 → PPO）；奖励模型的 Bradley-Terry 形式；
KL 惩罚防止跑偏；DPO 如何把 RLHF 的目标重写成可直接在偏好数据上优化的分类损失；
RLHF / DPO 的取舍与工程现实。
**代码题方向**：① 实现 DPO 损失；② 实现 PPO 的 KL 惩罚项并验证 β=0 时无惩罚。
**一手来源**：arXiv 2203.02155（InstructGPT）+ arXiv 2305.18290（DPO）。

## 0027 · capstone · 综合实战：为你的工作问题选算法（应用向重点）
**覆盖**：一张决策流程图：离散动作 → DQN/Rainbow 一族；连续动作 → SAC/TD3；
只能看日志 → BC/离线 RL；样本昂贵 → 模型基/规划；策略本身要输出动作且高维 → PPO；
配套的检查表：问题是否适合 RL、状态是否马尔可夫、奖励是否可度量、评估方案是什么；
评估与上线：离线评估、shadow 模式、A/B、护栏指标；
故障排查速查表：不收敛、方差大、过估计、奖励黑客、探索不足各自先查什么。
**代码题方向**：① 实现一个"算法推荐器"：输入问题特征返回算法族并给出理由；② 实现一个训练诊断函数：由学习曲线判断最可能的病因。
**一手来源**：第 0006 课的建模检查表 + Spinning Up 的 Key Concepts + Sutton &amp; Barto 第 1 章。
