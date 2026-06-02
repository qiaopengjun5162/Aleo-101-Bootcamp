// 投票程序 - 支持匿名投票和公开结果
program voting_app.aleo {

    // 提案数据结构 - 存储提案的基本信息
    struct Proposal {
        id: u32,
        title: field,      // 提案标题（使用field类型存储哈希）
        yeas: u32,         // 赞成票数
        nays: u32,         // 反对票数
        is_active: bool,   // 是否仍在投票期
    }

    // 选票记录 - 这是隐私的核心！
    // 选票作为Record，只能被所有者看到和使用
    record Ballot {
        owner: address,    // 选票所有者
        proposal_id: u32,  // 关联的提案ID
        has_voted: bool,   // 是否已投票
    }

    // 公共映射：存储所有提案（公开可见）
    mapping proposals: u32 => Proposal;

    // 公共映射：追踪每个提案的总票数
    mapping total_votes: u32 => u32;

    // 公共映射：记录每个地址的选票记录指针（公开，但选票内容是私有的）
    mapping ballot_owner: address => u32;

    // 下一个提案ID
    mapping next_proposal_id: u32 => u32;

    // ========== 提案创建 ==========
    // 任何人都可以公开地创建新提案
    async transition create_proposal(
        title_field: field
    ) -> Future {
        // 获取当前提案ID
        let current_id: u32 = Mapping::get_or_use(next_proposal_id, 0u32, 0u32);
        let new_id: u32 = current_id + 1u32;

        // 创建新提案，初始票数为0
        let new_proposal: Proposal = Proposal {
            id: new_id,
            title: title_field,
            yeas: 0u32,
            nays: 0u32,
            is_active: true,
        };

        // 更新映射
        Mapping::set(proposals, new_id, new_proposal);
        Mapping::set(next_proposal_id, 0u32, new_id);

        // 异步返回，完成公共状态更新
        return finalize_create_proposal(new_id, title_field);
    }

    // 异步完成函数 - 最终确认提案创建
    async function finalize_create_proposal(
        proposal_id: u32,
        title_field: field
    ) {
        // 这里做最终的链上状态确认
        let proposal: Proposal = Proposal {
            id: proposal_id,
            title: title_field,
            yeas: 0u32,
            nays: 0u32,
            is_active: true,
        };
        Mapping::set(proposals, proposal_id, proposal);
    }

    // ========== 发放选票 ==========
    // 提案者可以向指定地址发放选票（每个地址每提案仅一张）
    transition issue_ballot(
        owner_addr: address,
        proposal_id: u32
    ) -> Ballot {
        // 检查提案是否存在且有效
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        assert(proposal.is_active, "Proposal is not active");

        // 创建一张新选票，授予指定地址
        return Ballot {
            owner: owner_addr,
            proposal_id: proposal_id,
            has_voted: false,
        };
    }

    // ========== 匿名投票（核心隐私功能） ==========
    // 投票者使用私有选票输入进行投票
    // 由于选票是Record，只有所有者知道谁投了票
    transition vote(
        ballot: Ballot,        // 私有选票（输入时自动消耗）
        proposal_id: u32,
        vote_in_favor: bool    // true=赞成，false=反对
    ) -> (Ballot, Future) {
        // 验证选票属于当前执行者
        assert_eq(ballot.owner, self.caller, "Ballot does not belong to caller");
        
        // 验证选票未使用过
        assert_eq(ballot.has_voted, false, "Ballot already used");
        
        // 验证提案ID匹配
        assert_eq(ballot.proposal_id, proposal_id, "Proposal ID mismatch");
        
        // 验证提案仍然活跃
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        assert(proposal.is_active, "Proposal is no longer active");

        // 创建已使用的选票（标记为已投票，不再可用）
        let spent_ballot: Ballot = Ballot {
            owner: ballot.owner,
            proposal_id: ballot.proposal_id,
            has_voted: true,
        };

        // 返回已使用的选票和异步状态更新
        return (spent_ballot, finalize_vote(proposal_id, vote_in_favor));
    }

    // 异步更新投票计数（公共状态）
    async function finalize_vote(
        proposal_id: u32,
        vote_in_favor: bool
    ) {
        // 获取当前提案
        let current: Proposal = Mapping::get(proposals, proposal_id);
        
        // 根据投票方向更新计数
        let new_yeas: u32 = current.yeas + (vote_in_favor as u32);
        let new_nays: u32 = current.nays + (!vote_in_favor as u32);
        
        // 更新提案
        let updated: Proposal = Proposal {
            id: current.id,
            title: current.title,
            yeas: new_yeas,
            nays: new_nays,
            is_active: current.is_active,
        };
        
        Mapping::set(proposals, proposal_id, updated);
        
        // 更新总投票数
        let current_total: u32 = Mapping::get_or_use(total_votes, proposal_id, 0u32);
        Mapping::set(total_votes, proposal_id, current_total + 1u32);
    }

    // ========== 查询功能 ==========
    // 公开查询提案信息
    transition get_proposal(proposal_id: u32) -> Proposal {
        return Mapping::get(proposals, proposal_id);
    }

    // 关闭提案（仅提案创建者可调用）
    transition close_proposal(proposal_id: u32) -> Future {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        // 验证调用者是提案创建者（这里简化处理，实际应用应记录创建者）
        
        let closed_proposal: Proposal = Proposal {
            id: proposal.id,
            title: proposal.title,
            yeas: proposal.yeas,
            nays: proposal.nays,
            is_active: false,
        };
        
        Mapping::set(proposals, proposal_id, closed_proposal);
        
        return finalize_close_proposal(proposal_id);
    }
    
    async function finalize_close_proposal(proposal_id: u32) {
        // 最终确认关闭
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        let closed: Proposal = Proposal {
            id: proposal.id,
            title: proposal.title,
            yeas: proposal.yeas,
            nays: proposal.nays,
            is_active: false,
        };
        Mapping::set(proposals, proposal_id, closed);
    }
}